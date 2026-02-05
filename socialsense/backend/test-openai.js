import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env'), override: true });

const apiKey = process.env.OPENAI_API_KEY;
console.log('OpenAI API Key present:', !!apiKey);

const openai = new OpenAI({
    apiKey: apiKey,
});

async function testOpenAI() {
    try {
        console.log('Testing OpenAI API...');
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: "Say hello" }],
            max_tokens: 5,
        });
        console.log('Response:', response.choices[0].message.content);
    } catch (error) {
        console.error('OpenAI Test Error:', error);
        console.error('Error Details:', JSON.stringify(error, null, 2));
        if (error.cause) console.error('Error Cause:', error.cause);
    }
}

testOpenAI();
