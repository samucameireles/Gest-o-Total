import React, { useState, useRef } from 'react';
import { Upload, Link2, X, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadLogo, updateTenantLogoUrl } from '../lib/supabase';

interface LogoUploaderProps {
    tenantId: string;
    currentLogoUrl?: string;
    onSuccess: (url: string, path?: string) => void;
}

export const LogoUploader: React.FC<LogoUploaderProps> = ({ tenantId, currentLogoUrl, onSuccess }) => {
    const [uploading, setUploading] = useState(false);
    const [urlMode, setUrlMode] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Por favor, selecione uma imagem válida (PNG, JPG, WebP).');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setError('A imagem deve ter no máximo 2MB.');
            return;
        }

        setUploading(true);
        setError('');
        try {
            const publicUrl = await uploadLogo(file, tenantId);
            onSuccess(publicUrl);
        } catch (err: any) {
            console.error('Upload error:', err);
            setError('Erro ao enviar imagem: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleUrlSubmit = async () => {
        if (!urlInput.trim()) return;
        setUploading(true);
        setError('');
        try {
            await updateTenantLogoUrl(urlInput, tenantId);
            onSuccess(urlInput);
            setUrlMode(false);
            setUrlInput('');
        } catch (err: any) {
            setError('Erro ao salvar URL: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Logo da Lanchonete</label>
                <button
                    onClick={() => setUrlMode(!urlMode)}
                    className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1"
                >
                    {urlMode ? <Upload size={12} /> : <Link2 size={12} />}
                    {urlMode ? 'Upload de Arquivo' : 'Usar Link Externo'}
                </button>
            </div>

            {urlMode ? (
                <div className="flex gap-2">
                    <input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://exemplo.com/logo.png"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-accent"
                    />
                    <button
                        onClick={handleUrlSubmit}
                        disabled={uploading || !urlInput.trim()}
                        className="bg-accent text-white px-4 rounded-xl font-bold disabled:opacity-50 transition-all active:scale-95"
                    >
                        {uploading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                    </button>
                </div>
            ) : (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer bg-slate-50/50 hover:bg-slate-50 hover:border-accent group ${error ? 'border-red-200' : 'border-slate-200'}`}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*"
                    />

                    {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="animate-spin text-accent" size={32} />
                            <p className="text-xs font-bold text-slate-500">Enviando...</p>
                        </div>
                    ) : currentLogoUrl ? (
                        <div className="relative group">
                            <img src={currentLogoUrl} alt="Logo Preview" className="h-20 w-auto object-contain rounded-lg" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                <Upload className="text-white" size={20} />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <ImageIcon className="text-slate-400 group-hover:text-accent" size={24} />
                            </div>
                            <p className="text-sm font-bold text-slate-600 group-hover:text-accent transition-colors">Clique para enviar logo</p>
                            <p className="text-[10px] text-slate-400 mt-1">PNG, JPG ou WebP (Máx 2MB)</p>
                        </>
                    )}
                </div>
            )}

            {error && <p className="text-[10px] text-red-500 font-bold">{error}</p>}
        </div>
    );
};
