import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const ffmpegPath = require('ffmpeg-static');
import ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);
dotenv.config();

@Injectable()
export class SupabaseService {
    private supabase: SupabaseClient;

    constructor() {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_ANON_KEY;
        if (!url || !key) throw new Error("Koneksyon Supabase echwe: URL oswa KEY manke");
        this.supabase = createClient(url, key);
    }

    /**
     * 🔥 NOUVO: Netwaye non fichye a nèt pou Supabase pa bay erè
     */
    private sanitizeFileName(fileName: string): string {
        return fileName
            .normalize('NFD')                     // Separe aksan ak lèt (è -> e + `)
            .replace(/[\u0300-\u036f]/g, '')     // Retire aksan yo
            .replace(/[^a-zA-Z0-9.\-_]/g, '_')    // Ranplase tout sa ki pa lèt/chif/pwen pa _
            .replace(/_{2,}/g, '_')               // Evite double underscore (__)
            .toLowerCase();                       // Tout an miniskil pou sekirite
    }

    private async compressAudio(file: Express.Multer.File): Promise<Buffer> {
        const tempDir = path.join(process.cwd(), 'temp-uploads');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tempInput = path.join(tempDir, `input-${Date.now()}.tmp`);
        const tempOutput = path.join(tempDir, `output-${Date.now()}.mp3`);

        fs.writeFileSync(tempInput, file.buffer);

        return new Promise((resolve, reject) => {
            ffmpeg(tempInput)
                .toFormat('mp3')
                .audioBitrate(128)
                .on('end', () => {
                    try {
                        const compressedBuffer = fs.readFileSync(tempOutput);
                        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
                        if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
                        resolve(compressedBuffer);
                    } catch (readError) {
                        reject(readError);
                    }
                })
                .on('error', (err) => {
                    if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
                    if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
                    reject(err);
                })
                .save(tempOutput);
        });
    }

    async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
        let bufferToUpload = file.buffer;
        let finalMimeType = file.mimetype;
        
        // 1. Netwaye non an anvan nou fè anyen
        let cleanName = this.sanitizeFileName(file.originalname);
        
        if (file.mimetype.startsWith('audio/')) {
            console.log(`\x1b[33m[SupabaseService] Konpresyon: ${file.originalname}\x1b[0m`);
            
            try {
                const oldSize = (file.buffer.length / (1024 * 1024)).toFixed(2);
                bufferToUpload = await this.compressAudio(file);
                const newSize = (bufferToUpload.length / (1024 * 1024)).toFixed(2);
                
                finalMimeType = 'audio/mpeg';
                
                // 2. Ranje extension an pwòp (retire ansyen an, mete .mp3)
                const nameWithoutExt = cleanName.substring(0, cleanName.lastIndexOf('.')) || cleanName;
                cleanName = `${nameWithoutExt}.mp3`;

                console.log(`\x1b[32m[Siksè] ${oldSize}MB -> ${newSize}MB\x1b[0m`);
            } catch (err) {
                console.log(`\x1b[31m[Echèk] Konpresyon echwe, n ap voye orijinal: ${err.message}\x1b[0m`);
            }
        }

        const fileKey = `${folder}/${Date.now()}-${cleanName}`;

        const { data, error } = await this.supabase.storage
            .from('hmizik')
            .upload(fileKey, bufferToUpload, {
                contentType: finalMimeType,
                upsert: true
            });

        if (error) {
            console.error(`\x1b[31m[Supabase Error] Invalid Key Error nan: ${fileKey}\x1b[0m`);
            throw new Error(`Supabase error: ${error.message}`);
        }

        const { data: publicUrl } = this.supabase.storage
            .from('hmizik')
            .getPublicUrl(fileKey);

        return publicUrl.publicUrl;
    }
}