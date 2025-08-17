
async function sendPostRequest(postmessage:string) {
    const url = 'http://jp.minigeek.cn:9180/stock';
    const response = await fetch(url, {
        method: 'POST',
        body: postmessage,
        headers: {
            'Content-Type': 'text/plain',
        },
    });
    const data = await response.text();
    console.log('Response:', data);
}

export default {
    sendPostRequest,
} as const;



