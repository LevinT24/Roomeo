// services/marketplace.ts
import { supabase } from "@/lib/supabase";
import type { 
  Listing, 
  CreateListingData, 
  UpdateListingData, 
  ListingFilters, 
  ListingSortOptions 
} from "@/types/listing";

/**
 * Get all listings with seller information
 */
export async function getListings(
  filters?: ListingFilters,
  sort?: ListingSortOptions
): Promise<Listing[]> {
  try {
    console.log("🔍 Fetching listings with filters:", filters, "sort:", sort);

    let query = supabase
      .from('listings')
      .select(`
        *,
        seller:users!created_by (
          id,
          name,
          profilepicture
        )
      `);

    // Apply filters
    if (filters) {
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      } else {
        // Default to only active listings
        query = query.eq('status', 'active');
      }
    } else {
      // Default to only active listings
      query = query.eq('status', 'active');
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    } else {
      // Default sort by newest first
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching listings:", error);
      throw error;
    }

    console.log("✅ Fetched listings:", data?.length || 0);
    
    // Transform the data to match our Listing interface
    return data?.map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      location: item.location,
      images: item.images || [],
      created_by: item.created_by,
      status: item.status,
      created_at: new Date(item.created_at),
      updated_at: new Date(item.updated_at),
      seller: item.seller ? {
        id: item.seller.id,
        name: item.seller.name,
        profilePicture: item.seller.profilepicture
      } : undefined
    })) || [];

  } catch (error) {
    console.error("❌ Exception fetching listings:", error);
    throw error;
  }
}

/**
 * Get a single listing by ID with seller information
 */
export async function getListingById(id: string): Promise<Listing | null> {
  try {
    console.log("🔍 Fetching listing by ID:", id);

    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        seller:users!created_by (
          id,
          name,
          profilepicture
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log("📝 Listing not found");
        return null;
      }
      console.error("❌ Error fetching listing:", error);
      throw error;
    }

    console.log("✅ Fetched listing:", data.id);
    
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      price: data.price,
      location: data.location,
      images: data.images || [],
      created_by: data.created_by,
      status: data.status,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      seller: data.seller ? {
        id: data.seller.id,
        name: data.seller.name,
        profilePicture: data.seller.profilepicture
      } : undefined
    };

  } catch (error) {
    console.error("❌ Exception fetching listing:", error);
    throw error;
  }
}

/**
 * Create a new listing
 */
export async function createListing(listingData: CreateListingData): Promise<Listing> {
  try {
    console.log("🔄 Creating new listing:", listingData);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    const newListing = {
      title: listingData.title,
      description: listingData.description || null,
      price: listingData.price || null,
      location: listingData.location || null,
      images: listingData.images || [],
      created_by: user.id,
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('listings')
      .insert(newListing)
      .select(`
        *,
        seller:users!created_by (
          id,
          name,
          profilepicture
        )
      `)
      .single();

    if (error) {
      console.error("❌ Error creating listing:", error);
      throw error;
    }

    console.log("✅ Created listing:", data.id);
    
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      price: data.price,
      location: data.location,
      images: data.images || [],
      created_by: data.created_by,
      status: data.status,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      seller: data.seller ? {
        id: data.seller.id,
        name: data.seller.name,
        profilePicture: data.seller.profilepicture
      } : undefined
    };

  } catch (error) {
    console.error("❌ Exception creating listing:", error);
    throw error;
  }
}

/**
 * Update a listing (only by owner)
 */
export async function updateListing(id: string, updates: UpdateListingData): Promise<Listing> {
  try {
    console.log("🔄 Updating listing:", id, updates);

    // Verify user is authenticated and owns the listing
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    // Check if user owns the listing
    const { data: existingListing, error: fetchError } = await supabase
      .from('listings')
      .select('created_by')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error("❌ Error fetching listing for ownership check:", fetchError);
      throw new Error("Listing not found");
    }

    if (existingListing.created_by !== user.id) {
      throw new Error("Unauthorized: You can only update your own listings");
    }

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        seller:users!created_by (
          id,
          name,
          profilepicture
        )
      `)
      .single();

    if (error) {
      console.error("❌ Error updating listing:", error);
      throw error;
    }

    console.log("✅ Updated listing:", data.id);
    
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      price: data.price,
      location: data.location,
      images: data.images || [],
      created_by: data.created_by,
      status: data.status,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      seller: data.seller ? {
        id: data.seller.id,
        name: data.seller.name,
        profilePicture: data.seller.profilepicture
      } : undefined
    };

  } catch (error) {
    console.error("❌ Exception updating listing:", error);
    throw error;
  }
}

/**
 * Delete a listing (only by owner)
 */
export async function deleteListing(id: string): Promise<boolean> {
  try {
    console.log("🔄 Deleting listing:", id);

    // Verify user is authenticated and owns the listing
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    // Check if user owns the listing
    const { data: existingListing, error: fetchError } = await supabase
      .from('listings')
      .select('created_by')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error("❌ Error fetching listing for ownership check:", fetchError);
      throw new Error("Listing not found");
    }

    if (existingListing.created_by !== user.id) {
      throw new Error("Unauthorized: You can only delete your own listings");
    }

    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("❌ Error deleting listing:", error);
      throw error;
    }

    console.log("✅ Deleted listing:", id);
    return true;

  } catch (error) {
    console.error("❌ Exception deleting listing:", error);
    throw error;
  }
}

/**
 * Mark listing as sold (only by owner)
 */
export async function markListingAsSold(id: string): Promise<Listing> {
  return updateListing(id, { status: 'sold' });
}

/**
 * Get listings by user ID
 */
export async function getUserListings(userId: string): Promise<Listing[]> {
  try {
    console.log("🔍 Fetching listings for user:", userId);

    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        seller:users!created_by (
          id,
          name,
          profilepicture
        )
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ Error fetching user listings:", error);
      throw error;
    }

    console.log("✅ Fetched user listings:", data?.length || 0);
    
    return data?.map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      location: item.location,
      images: item.images || [],
      created_by: item.created_by,
      status: item.status,
      created_at: new Date(item.created_at),
      updated_at: new Date(item.updated_at),
      seller: item.seller ? {
        id: item.seller.id,
        name: item.seller.name,
        profilePicture: item.seller.profilepicture
      } : undefined
    })) || [];

  } catch (error) {
    console.error("❌ Exception fetching user listings:", error);
    throw error;
  }
}

/**
 * Upload image to Supabase Storage
 */
export async function uploadListingImage(file: File, listingId?: string): Promise<string> {
  try {
    console.log("🔄 Uploading image:", file.name, "Size:", file.size, "Type:", file.type);

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${listingId || 'temp'}_${Date.now()}.${fileExt}`;
    const filePath = `listings/${fileName}`;

    console.log("🔄 Attempting upload to path:", filePath);

    // First, quickly check what buckets actually exist
    let bucketNames = ['images', 'listings', 'uploads', 'public']; // fallback
    try {
      const bucketListPromise = supabase.storage.listBuckets();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Bucket list timeout')), 3000)
      );
      
      const { data: buckets, error: listError } = await Promise.race([bucketListPromise, timeoutPromise]);
      
      if (!listError && buckets && buckets.length > 0) {
        bucketNames = buckets.map(b => b.name);
        console.log("📋 Available buckets:", bucketNames);
      } else {
        console.log("⚠️ Using fallback bucket list:", bucketNames);
      }
    } catch (listErr) {
      console.log("⚠️ Could not list buckets, using fallback:", listErr);
    }

    let uploadSuccess = false;
    let publicUrl = '';
    let finalBucket = '';
    let lastError = '';

    for (const bucketName of bucketNames) {
      try {
        console.log(`🔄 Trying bucket: ${bucketName}`);
        
        // Add timeout to prevent hanging
        const uploadPromise = supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Upload timeout for bucket ${bucketName}`)), 10000)
        );

        const { error } = await Promise.race([uploadPromise, timeoutPromise]);

        if (error) {
          console.log(`❌ Bucket ${bucketName} failed:`, error.message);
          lastError = error.message;
          continue;
        }

        console.log(`✅ Upload successful to bucket: ${bucketName}`);
        
        // Get public URL
        const { data: { publicUrl: url } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        publicUrl = url;
        finalBucket = bucketName;
        uploadSuccess = true;
        break;

      } catch (bucketError) {
        const errorMsg = bucketError instanceof Error ? bucketError.message : String(bucketError);
        console.log(`❌ Exception with bucket ${bucketName}:`, errorMsg);
        lastError = errorMsg;
        continue;
      }
    }

    if (!uploadSuccess) {
      console.error("❌ All storage buckets failed:", lastError);
      throw new Error(`Image upload failed: ${lastError || 'No accessible storage buckets found'}. Please check Supabase storage configuration.`);
    }

    console.log("✅ Final uploaded image URL:", publicUrl, "from bucket:", finalBucket);
    return publicUrl;

  } catch (error) {
    console.error("❌ Exception uploading image:", error);
    // Provide more specific error message
    if (error instanceof Error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
    throw new Error("Image upload failed: Unknown error occurred");
  }
}