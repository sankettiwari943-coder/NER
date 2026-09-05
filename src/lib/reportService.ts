import { supabase } from './supabase';

export async function uploadFieldPhoto(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `reports/${fileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('hazard-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Fallback to base64 if bucket fails
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    const { data } = supabase.storage
      .from('hazard-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Photo upload exception:', err);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
}
