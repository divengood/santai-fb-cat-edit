
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

    const removeImage = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent setting as main when clicking delete
        const removed = images.find(img => img.id === id);
        const filtered = images.filter(img => img.id !== id);
        
        // If we removed the main image, pick another one to be main
        if (removed?.isMain && filtered.length > 0) {
            const firstSuccess = filtered.find(img => img.status === 'success');
            if (firstSuccess) {
                onImagesChange(filtered.map(img => img.id === firstSuccess.id ? { ...img, isMain: true } : img));
                return;
            }
        }
        onImagesChange(filtered);
    };

    const setMain = (id: string) => {
        const target = images.find(img => img.id === id);
        if (target?.status !== 'success') return;

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
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center font-medium">Перетащите сюда фото или нажмите для выбора</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">До {maxImages} изображений. Кликните на фото, чтобы сделать его главным.</p>
            </div>

            {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {images.map((img) => (
                        <div 
                            key={img.id} 
                            onClick={() => !img.isMain && setMain(img.id)}
                            className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 shadow-sm ${
                                img.isMain 
                                    ? 'border-blue-500 ring-2 ring-blue-500/20 scale-100 shadow-md' 
                                    : 'border-transparent bg-gray-100 dark:bg-gray-700 hover:border-blue-300 hover:scale-[1.02] cursor-pointer'
                            }`}
                        >
                            <img src={img.localPreview} alt="preview" className="w-full h-full object-cover" />
                            
                            {img.status === 'uploading' && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Spinner size="sm" />
                                </div>
                            )}

                            {img.status === 'success' && (
                                <div className={`absolute inset-0 transition-opacity bg-black/30 flex flex-col items-center justify-center gap-2 ${img.isMain ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                                    {!img.isMain && (
                                        <div className="bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider">
                                            Сделать главным
                                        </div>
                                    )}
                                    <button 
                                        type="button" 
                                        onClick={(e) => removeImage(e, img.id)}
                                        className="text-[10px] bg-red-600/90 text-white px-3 py-1 rounded hover:bg-red-700 font-bold uppercase transition-colors"
                                    >
                                        Удалить
                                    </button>
                                </div>
                            )}

                            {img.status === 'error' && (
                                <div className="absolute inset-0 bg-red-500/30 flex flex-col items-center justify-center p-2 text-center">
                                    <span className="text-[10px] text-white font-bold bg-red-600 rounded px-2 py-0.5 shadow">Ошибка</span>
                                    <button 
                                        type="button" 
                                        onClick={(e) => removeImage(e, img.id)}
                                        className="mt-2 text-[10px] bg-white text-red-600 px-2 py-0.5 rounded font-bold"
                                    >
                                        Убрать
                                    </button>
                                </div>
                            )}

                            {img.isMain && img.status === 'success' && (
                                <div className="absolute top-2 left-2 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md uppercase tracking-tighter">
                                    Главное
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
