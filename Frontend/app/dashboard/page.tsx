"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Shield, Mail, MailOpen, CheckSquare, Scan, AlertTriangle, LogOut, Menu, X } from "lucide-react"
import { ScanResultsModal } from "@/components/scan-results-modal"
import { useAuth } from "@clerk/nextjs"
import getTokensfromUserId from "@/lib/func/getTokens"
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
async function fetchEmails(token: any) {
  const response = await fetch(`${backendUrl}/get-messages/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ token })
  })
  if (!response.ok) throw new Error("Failed to fetch emails")
  // console.log("Response status:", response.status)
  // console.log("Response headers:", response.headers)
  console.log("Request body:", response)
  const data = await response.json()
  return data
}

type Email = {
  id: number
  sender: string
  subject: string
  date: string
  preview: string
  phishingScore: number
  isPhishing: boolean
  selected?: boolean
  urls?: string
}

export default function Dashboard() {

  const { getToken } = useAuth()
  const [emails, setEmails] = useState<Email[]>([])
  const [scanMode, setScanMode] = useState<"all" | "unread" | "selected">("all")
  const [isScanning, setIsScanning] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  useEffect(() => {
    async function loadEmails() {
      const tokensArr = await getTokensfromUserId()
      if (!tokensArr || !Array.isArray(tokensArr) || tokensArr.length === 0) {
        console.error("No token data found")
        return
      }
      const tokenObj = tokensArr[0]
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
      try {
        const data = await fetchEmails(token)
        console.log("Fetched emails:", data)
        const emailsArr = Array.isArray(data.messages) ? data.messages : []
        const mappedEmails: Email[] = emailsArr.map((emailObj: any) => ({
          id: emailObj.id,
          sender: emailObj.sender_name || emailObj.sender_email || "Unknown",
          subject: emailObj.subject || "",
          date: "", // No date in schema, leave blank or parse if available
          preview: emailObj.body?.slice(0, 100) || "",
          phishingScore: 0, // Default, update if you have scoring logic
          isPhishing: false, // Default, update if you have detection logic
          selected: false
        }))
        setEmails(mappedEmails)
      } catch {
        setEmails([])
      }
    }
    loadEmails()
  }, [getTokensfromUserId])

  const handleScan = async () => {
    setIsScanning(true)
    // Prepare emails to scan based on scanMode
    let emailsToScan: Email[] = []
    if (scanMode === "all") {
      emailsToScan = emails
    } else if (scanMode === "unread") {
      // Assuming unread logic, update as needed
      emailsToScan = emails.filter(email => !email.isPhishing)
    } else if (scanMode === "selected") {
      emailsToScan = emails.filter(email => email.selected)
    }

    // Call /check-phishing API for each email
    const scanResults = await Promise.all(
      emailsToScan.map(async (email) => {
      const payload = {
        body: email.preview,
        subject: email.subject,
        urls: email.urls || "", // Add logic to extract URLs if available
        sender: email.sender,
      }
      console.log("Scanning email:", payload)
      try {
        const res = await fetch(`${backendUrl}/check-phishing`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Scan failed")
        const result = await res.json()
        return { ...email, phishingScore: result.phishingScore, isPhishing: result.isPhishing }
      } catch {
        return { ...email, phishingScore: 0, isPhishing: false }
      }
      })
    )
    setEmails(
      emails.map(email =>
      scanResults.find(e => e.id === email.id) || email
      )
    )
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsScanning(false)
    setShowResults(true)
  }

  const handleEmailSelect = (emailId: number) => {
    setEmails(emails.map((email) => (email.id === emailId ? { ...email, selected: !email.selected } : email)))
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-red-600 bg-red-50"
    if (score >= 40) return "text-yellow-600 bg-yellow-50"
    return "text-green-600 bg-green-50"
  }

  const getRowColor = (score: number) => {
    if (score >= 70) return "bg-red-50 border-red-200"
    if (score >= 40) return "bg-yellow-50 border-yellow-200"
    return "bg-green-50 border-green-200"
  }

  const phishingEmails = emails.filter((email) => email.isPhishing)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      {/* <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900 hidden sm:block">Gmail Phishing Detector</h1>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-100">
                <Avatar className="w-8 h-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium">John Doe</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header> */}

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out`}
        >
          <div className="p-4 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Scan Options</h2>
            <div className="space-y-2">
              <Button
                variant={scanMode === "all" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setScanMode("all")}
              >
                <Mail className="w-4 h-4 mr-2" />
                Scan All Emails
              </Button>
              <Button
                variant={scanMode === "unread" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setScanMode("unread")}
              >
                <MailOpen className="w-4 h-4 mr-2" />
                Scan Unread Emails
              </Button>
              <Button
                variant={scanMode === "selected" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setScanMode("selected")}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Scan Selected Emails
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Inbox Scanner</h2>
                <p className="text-gray-600 mt-1">
                  {scanMode === "all" && "Scanning all emails in your inbox"}
                  {scanMode === "unread" && "Scanning unread emails only"}
                  {scanMode === "selected" && "Scanning selected emails only"}
                </p>
              </div>
              <Button onClick={handleScan} disabled={isScanning} className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700">
                {isScanning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4 mr-2" />
                    Start Scan
                  </>
                )}
              </Button>
            </div>

            {/* Email List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Inbox ({emails.length} emails)</span>
                  {phishingEmails.length > 0 && (
                    <Badge variant="destructive" className="flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{phishingEmails.length} Phishing Detected</span>
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {scanMode === "selected" && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Select
                          </th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sender
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          Preview
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Risk Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {emails.map((email, idx) => (
                        <tr
                          key={email.id ?? idx}
                          className={`hover:bg-gray-50 transition-colors ${getRowColor(email.phishingScore)}`}
                        >
                          {scanMode === "selected" && (
                            <td className="px-4 py-4">
                              <Checkbox checked={email.selected} onCheckedChange={() => handleEmailSelect(email.id)} />
                            </td>
                          )}
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">{email.sender}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900 font-medium">{email.subject}</div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500 hidden md:table-cell">{email.date}</td>
                          <td className="px-4 py-4 text-sm text-gray-500 hidden lg:table-cell max-w-xs">
                            <div className="truncate">{email.preview}</div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge className={getScoreColor(email.phishingScore)}>
                              {email.isPhishing ? (
                                <>
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Flagged
                                </>
                              ) : (
                                `${email.phishingScore}/100`
                              )}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <ScanResultsModal
        open={showResults}
        onOpenChange={setShowResults}
        phishingEmails={phishingEmails}
        totalEmails={emails.length}
      />
    </div>
  )
}
// Define OAuthProvider type or import it if available
type OAuthProvider = "google" | "facebook" | "github" // Add other providers as needed

