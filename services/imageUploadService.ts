import { Logger } from './loggingService';

/**
 * Uploads an image file to Cloudinary using an unsigned upload preset.
 *
 * @param file The image file to upload.
 * @param cloudName Your Cloudinary cloud name.
 * @param uploadPreset The name of your unsigned upload preset on Cloudinary.
 * @param logger Optional logger instance.
 * @returns A promise that resolves with the secure public URL for the image.
 */
export const uploadImage = async (file: File, cloudName: string, uploadPreset: string, logger?: Logger): Promise<string> => {
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary Cloud Name and Upload Preset are required.");
  }
  if (!file.type.startsWith('image/')) {
    throw new Error("Invalid file type. Please upload an image.");
  }

  logger?.info(`Uploading image "${file.name}" to Cloudinary cloud "${cloudName}"...`);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cloudinary API Error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to upload image to Cloudinary.');
    }

    const responseData = await response.json();
    if (responseData.secure_url) {
      logger?.success(`Successfully uploaded "${file.name}". URL: ${responseData.secure_url}`);
      return responseData.secure_url;
    } else {
      throw new Error('Cloudinary API did not return a valid URL.');
    }
  } catch (error) {
    logger?.error(`Failed to upload image "${file.name}"`, error);
    throw error;
  }
};