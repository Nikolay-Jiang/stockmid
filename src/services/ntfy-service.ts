import ntfyRepo from '@repos/ntfy-repo';


async function sendPostRequest(postmessage:string) {
     await ntfyRepo.sendPostRequest(postmessage);
}