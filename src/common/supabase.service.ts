import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();
@Injectable()
export class SupabaseService {
    private supabase: SupabaseClient;

    constructor() {
        // Rekipere enfòmasyon yo nan .env la
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_ANON_KEY;

        // Tcheke si yo egziste pou evite erè "undefined"
        if (!url || !key) {
            throw new Error("Koneksyon Supabase echwe: URL oswa KEY manke nan .env");
        }

        // PASSE TOU DE PARAMÈT YO ISIT LA
        this.supabase = createClient(url, key);
    }
    async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
        const fileName = `${folder}/${Date.now()}-${file.originalname}`;

        const { data, error } = await this.supabase.storage
            .from('hmizik') // Non Bucket ou te kreye a
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) throw new Error(`Supabase error: ${error.message}`);

        // Rekipere URL piblik la
        const { data: publicUrl } = this.supabase.storage
            .from('hmizik')
            .getPublicUrl(fileName);

        return publicUrl.publicUrl;
    }
} 