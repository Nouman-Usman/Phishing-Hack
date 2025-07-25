'use server'
import { auth } from '@clerk/nextjs/server';

async function getTokensfromUserId() {
  const { userId } = await auth();
  const provider = "oauth_google"; 
  const clerkSecretKey = process.env.CLERK_SECRET_KEY || "";

  const response = await fetch(
    `https://api.clerk.com/v1/users/${userId}/oauth_access_tokens/${provider}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();
  return data;
}


export default getTokensfromUserId