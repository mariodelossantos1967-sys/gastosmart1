import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, X, CheckCircle } from 'lucide-react';
import { analyzeReceiptImage } from '../services/geminiService';
import { ReceiptData } from '../types';

interface ReceiptUploaderProps {
  onScanComplete: (data: ReceiptData) => void;
}

export const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({ onScanComplete }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPreview(base64String);
      processImage(base64String);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64Full: string) => {
    setIsAnalyzing(true);
    try {
      // Remove data:image/jpeg;base64, prefix for API
      const base64Data = base64Full.split(',')[1];
      const data = await analyzeReceiptImage(base64Data);
      onScanComplete(data);
    } catch (error) {
      alert("Error al procesar la factura. Por favor intenta manualmente.");
      setPreview(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="mb-6">
      <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-brand-500 transition-colors bg-white group">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={isAnalyzing}
        />
        
        {!preview ? (
          <div className="flex flex-col items-center justify-center text-gray-500 space-y-3">
            <div className="p-4 bg-brand-50 rounded-full text-brand-500 group-hover:bg-brand-100 transition-colors">
              <Camera size={32} />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-700">Toca para escanear factura</p>
              <p className="text-sm text-gray-400">o arrastra una imagen aquí</p>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            <img src={preview} alt="Receipt preview" className="h-full object-contain" />
            
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                <Loader2 className="animate-spin mb-2" size={32} />
                <p className="font-medium">Analizando con Gemini Pro...</p>
              </div>
            )}

            {!isAnalyzing && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  clearImage();
                }}
                className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg text-red-500 z-20 hover:bg-gray-50"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Helper text */}
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 px-1">
        <Upload size={14} />
        <span>Soporta JPG, PNG. La IA detectará el monto y categoría.</span>
      </div>
    </div>
  );
};