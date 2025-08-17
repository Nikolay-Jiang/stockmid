import ntfyRepo from '@repos/ntfy-repo';


async function sendPostRequest(postmessage:string) {
     await ntfyRepo.sendPostRequest(postmessage);
}

// Export default
export default {
    sendPostRequest,

} as const;