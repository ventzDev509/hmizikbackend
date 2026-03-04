import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Pake sa a pèmèt FFmpeg kouri sou Render oswa nenpòt lòt OS san enstalasyon manyèl
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

        if (!url || !key) {
            throw new Error("Koneksyon Supabase echwe: URL oswa KEY manke nan .env");
        }

        this.supabase = createClient(url, key);
    }

    /**
     * Lojik konpresyon an an MP3 128kbps
     */
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
                        
                        // Netwaye fichye yo imedyatman
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

    /**
     * Upload prensipal
     */
    async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
        // Nou kòmanse ak done orijinal yo
        let bufferToUpload = file.buffer;
        let finalMimeType = file.mimetype;
        const cleanName = file.originalname.replace(/\s+/g, '_');
        let fileName = `${folder}/${Date.now()}-${cleanName}`;

        // Chèk si se yon audio pou n konprese l
        if (file.mimetype.startsWith('audio/')) {
            console.log(`\x1b[33m[SupabaseService] Pwosesis konpresyon ap kòmanse pou: ${file.originalname}\x1b[0m`);
            
            try {
                const oldSize = (file.buffer.length / (1024 * 1024)).toFixed(2);
                
                // RANPLASE BUFFER A AK SA KI KONPRESE A
                bufferToUpload = await this.compressAudio(file);
                
                const newSize = (bufferToUpload.length / (1024 * 1024)).toFixed(2);
                finalMimeType = 'audio/mpeg';
                fileName = fileName.replace(/\.[^/.]+$/, "") + ".mp3";

                console.log(`\x1b[32m[Siksè] Audio konprese! Old size: ${oldSize}MB -> New size: ${newSize}MB\x1b[0m`);
            } catch (err) {
                console.log(`\x1b[31m[Echèk] Konpresyon pa t mache, n ap voye orijinal la. Erè: ${err.message}\x1b[0m`);
                // bufferToUpload rete file.buffer (sa k te deklare anlè a)
            }
        } else {
            console.log(`\x1b[34m[Info] Fichye sa a se pa audio (image/etc), n ap voye l san chanjman.\x1b[0m`);
        }

        // Upload sou Supabase ak buffer final la
        const { data, error } = await this.supabase.storage
            .from('hmizik')
            .upload(fileName, bufferToUpload, {
                contentType: finalMimeType,
                upsert: true
            });

        if (error) {
            console.error(`\x1b[31m[Supabase Error] Upload echwe: ${error.message}\x1b[0m`);
            throw new Error(`Supabase error: ${error.message}`);
        }

        const { data: publicUrl } = this.supabase.storage
            .from('hmizik')
            .getPublicUrl(fileName);

        console.log(`\x1b[36m[Done] Upload fini: ${publicUrl.publicUrl}\x1b[0m`);
        return publicUrl.publicUrl;
    }
}