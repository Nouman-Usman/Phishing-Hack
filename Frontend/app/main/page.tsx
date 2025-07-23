"use client"

import { useAuth } from "@clerk/nextjs"
import getTokensfromUserId from "@/lib/func/getTokens"
import { useEffect, useState } from "react"

async function fetchEmails(token: any) {
  const response = await fetch("http://localhost:5000/get-messages/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ token })
  })
  if (!response.ok) throw new Error("Failed to fetch emails")
  const data = await response.json()
  console.log("Fetched emails:", data.details?.slice(0, 10))
  return data
}

export default function DashboardPage() {
  const [emails, setEmails] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getEmails() {
      try {
        const tokens = await getTokensfromUserId()
        if (!tokens || tokens.length === 0) {
          setError("No tokens found for the user.")
          setLoading(false)
          return
        }
        const tokenObj = tokens[0]
        const token = {
          token: {
            access_token: tokenObj.token || "",
            client_id: process.env.NEXT_PUBLIC_CLIENT_ID || "",
            client_secret: process.env.NEXT_PUBLIC_CLIENT_SECRET || "",
            userId: tokenObj.provider_user_id || "",
            token_type: "Bearer",
          },
          maxResults: 10,
          labelIds: ["INBOX"],
          includeSpamTrash: false
        }
        const data = await fetchEmails(token)
        setEmails(data)
      } catch (err) {
        setError("Error fetching emails. Please try again later.")
      } finally {
        setLoading(false)
      }
    }
    getEmails()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }
  if (error) {
    return <div>{error}</div>
  }
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Your Emails</h1>
      <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(emails, null, 2)}</pre>
    </div>
  )
}