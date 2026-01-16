
import React, { useState, useCallback } from 'react';
import { Spinner } from './Spinner';
import { uploadImage } from '../services/imageUploadService';
import { Logger } from '../services/loggingService';

interface UploadedImage {
    url: string;
    isMain: boolean;
    localPreview: string;
    id: string;
    status: 'uploading' | 'success' | 'error';
    error?: string;
}

interface ImageDropzoneProps {
    images: UploadedImage[];
    onImagesChange: (images: UploadedImage[]) => void;
    cloudinaryCloudName: string;
    cloudinaryUploadPreset: string;
    logger?: Logger;
    maxImages?: number;
}

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({
    images,
    onImagesChange,
    cloudinaryCloudName,
    cloudinaryUploadPreset,
    logger,
    maxImages = 10
}) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleUpload = useCallback(async (files: FileList) => {
        const newUploads: UploadedImage[] = [];
        const fileArray = Array.from(files).slice(0, maxImages - images.length);

        if (fileArray.length === 0) return;

        fileArray.forEach(file => {
            const id = Math.random().toString(36).substr(2, 9);
            const preview = URL.createObjectURL(file);
            newUploads.push({
                id,
                url: '',
                isMain: false,
                localPreview: preview,
                status: 'uploading'
            });

            uploadImage(file, cloudinaryCloudName, cloudinaryUploadPreset, logger)
                .then(url => {
                    onImagesChange(prev => {
                        const updated = prev.map(img => {
                            if (img.id === id) {
                                // If this is the first image ever added and no main is set, make it main
                                const hasMain = prev.some(p => p.isMain && p.status === 'success');
                                return { ...img, url, status: 'success' as const, isMain: !hasMain };
                            }
                            return img;
                        });
                        return updated;
                    });
                })
                .catch(err => {
                    onImagesChange(prev => prev.map(img => 
                        img.id === id ? { ...img, status: 'error', error: err.message } : img
                    ));
                });
        });

        onImagesChange([...images, ...newUploads]);
    }, [images, maxImages, onImagesChange, cloudinaryCloudName, cloudinaryUploadPreset, logger]);

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = () => {
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files);
        }
    };

    const removeImage = (id: string) => {
        const removed = images.find(img => img.id === id);
        const filtered = images.filter(img => img.id !== id);
        
        // If we removed the main image, pick another one to be main
        if (removed?.isMain && filtered.length > 0) {
            const firstSuccess = filtered.find(img => img.status === 'success');
            if (firstSuccess) firstSuccess.isMain = true;
        }
        onImagesChange(filtered);
    };

    const setMain = (id: string) => {
        onImagesChange(images.map(img => ({
            ...img,
            isMain: img.id === id
        })));
    };

    return (
        <div className="space-y-3">
            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                    isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                onClick={() => document.getElementById('file-upload')?.click()}
            >
                <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleUpload(e.target.files)}
                />
                <svg className="h-10 w-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-600 dark:text-gray-400">Drag & Drop images or click to select</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Up to {maxImages} images (Main image selection enabled)</p>
            </div>

            {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {images.map((img) => (
                        <div key={img.id} className={`relative group aspect-square rounded-md overflow-hidden border-2 ${img.isMain ? 'border-blue-500 shadow-sm' : 'border-transparent bg-gray-100 dark:bg-gray-700'}`}>
                            <img src={img.localPreview} alt="preview" className="w-full h-full object-cover" />
                            
                            {img.status === 'uploading' && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Spinner size="sm" />
                                </div>
                            )}

                            {img.status === 'success' && (
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 flex flex-col items-center justify-center gap-1">
                                    {!img.isMain && (
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.stopPropagation(); setMain(img.id); }}
                                            className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700"
                                        >
                                            Set Main
                                        </button>
                                    )}
                                    <button 
                                        type="button" 
                                        onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                                        className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700"
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}

                            {img.status === 'error' && (
                                <div className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center p-1 text-center">
                                    <span className="text-[8px] text-red-600 font-bold bg-white/80 rounded px-1">Error</span>
                                    <button 
                                        type="button" 
                                        onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                                        className="mt-1 text-[8px] bg-red-600 text-white px-1 rounded"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            )}

                            {img.isMain && img.status === 'success' && (
                                <div className="absolute top-1 left-1 bg-blue-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow">
                                    MAIN
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
