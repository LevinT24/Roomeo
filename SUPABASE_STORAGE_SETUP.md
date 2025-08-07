# Supabase Storage Setup for Marketplace

## Quick Setup Guide

Your marketplace functionality is ready, but you need to create a storage bucket in Supabase for image uploads.

### Steps:

1. **Go to your Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Create Storage Bucket**
   - Navigate to "Storage" in the left sidebar
   - Click "Create a new bucket"
   - Name it: `images` (recommended) or `listings`
   - Make it **Public** (so images can be displayed)
   - Click "Create bucket"

3. **Set Storage Policies (Optional)**
   - Click on your bucket → "Policies"
   - Add policy to allow authenticated users to upload:
   ```sql
   CREATE POLICY "Allow authenticated uploads" ON storage.objects
   FOR INSERT WITH CHECK (auth.role() = 'authenticated');
   ```

4. **Test the Setup**
   - Try creating a listing with an image
   - Check the console logs to see which bucket works

### Troubleshooting

If image upload still fails:
- Check console logs for bucket availability
- Ensure bucket is public
- Verify your Supabase storage URL is correct
- The system will automatically try different bucket names: `images`, `listings`, `uploads`, `public`

### Alternative: No Images Mode

The marketplace works without images too! If upload fails, you'll get an option to create listings without images.