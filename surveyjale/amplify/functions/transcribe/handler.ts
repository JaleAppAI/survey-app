import {
    TranscribeClient,
    StartTranscriptionJobCommand,
    GetTranscriptionJobCommand,
} from '@aws-sdk/client-transcribe';
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { env } from '$amplify/env/transcribe';

const transcribeClient = new TranscribeClient({});
const s3Client = new S3Client({});

const BUCKET_NAME = env.STORAGE_BUCKET_NAME;

export const handler = async(event:any) => {
    const audio = event.arguments?.audio;
    if(!audio || typeof audio !== 'string'){
        throw new Error('audio field required (base64 string)');
    }

    const audioBuffer = Buffer.from(audio, 'base64');
    const jobName = `transcribe-${Date.now()}`;
    const s3key = `temp-audio/${jobName}.webm`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3key,
            Body: audioBuffer,
            ContentType: 'audio/webm'

        })

    );

    await transcribeClient.send(
        new StartTranscriptionJobCommand({
            TranscriptionJobName: jobName,
            IdentifyMultipleLanguages: true,
            LanguageOptions: ['en-US', 'es-US'],
            Media: {
                MediaFileUri: `s3://${BUCKET_NAME}/${s3key}`,
            },
            OutputBucketName: BUCKET_NAME,
            OutputKey: `transcripts/${jobName}.json`,
        })

    );

    let status = 'IN_PROGRESS';
    while(status === "IN_PROGRESS"){
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const result  = await transcribeClient.send(
            new GetTranscriptionJobCommand({
                TranscriptionJobName: jobName,
            })
        );
        status = result.TranscriptionJob?.TranscriptionJobStatus || 'FAILED';
    }

    let transcript = '';
    if(status === 'COMPLETED'){
        //fetch transcript from s3
        const output = await s3Client.send(
            new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: `transcripts/${jobName}.json`,
            })
        );

        const resultJson = JSON.parse(await output.Body!.transformToString());
        transcript = resultJson.results?.transcripts?.[0]?.transcript || '';

        //Clean up temp audio files
        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: s3key,
            })
        );

        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: `transcripts/${jobName}.json`
            })
        );
    }

    return transcript;

}

