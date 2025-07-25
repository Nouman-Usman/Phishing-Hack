"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Mail, MailOpen, CheckSquare, Scan, AlertTriangle, LogOut, Menu, X, Loader2, Inbox, ChevronLeft, ChevronRight, Filter } from "lucide-react"
import { ScanResultsModal } from "@/components/scan-results-modal"
import { useAuth } from "@clerk/nextjs"
import getTokensfromUserId from "@/lib/func/getTokens"
import { motion } from "framer-motion"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
async function fetchEmails(token: any) {
  const response = await fetch(`${backendUrl}/get-messages/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ token })
  })
  
  console.log("Response status:", response.status)
  console.log("Request body:", response)
  
  if (response.status !== 200) {
    throw new Error(`Failed to fetch emails: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  return data
}

type Email = {
  id: string
  sender: string
  sender_email: string
  subject: string
  preview: string
  phishingScore: number
  isPhishing: boolean
  selected?: boolean
  urls?: string[]
  body: string
}

export default function Dashboard() {
  const { getToken } = useAuth()
  const [emails, setEmails] = useState<Email[]>([])
  const [isLoadingEmails, setIsLoadingEmails] = useState(true)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [scanMode, setScanMode] = useState<"all" | "unread" | "selected">("all")
  const [isScanning, setIsScanning] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [previewEmail, setPreviewEmail] = useState<Email | null>(null)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    async function loadEmails() {
      setIsLoadingEmails(true)
      setEmailError(null)
      
      try {
        const tokensArr = await getTokensfromUserId()
        if (!tokensArr || !Array.isArray(tokensArr) || tokensArr.length === 0) {
          throw new Error("No token data found")
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
        
        const data = await fetchEmails(token)
        console.log("Fetched emails:", data)
        const emailsArr = Array.isArray(data.messages) ? data.messages : []
        const mappedEmails: Email[] = emailsArr.map((emailObj: any) => ({
          id: emailObj.id,
          sender: emailObj.sender_name || "Unknown",
          sender_email: emailObj.sender_email || "",
          subject: emailObj.subject || "",
          preview: emailObj.body?.slice(0, 100) || "",
          body: emailObj.body || "",
          urls: emailObj.urls || [],
          phishingScore: 0, 
          isPhishing: false, 
          selected: false
        }))
        setEmails(mappedEmails)
      } catch (error) {
        console.error("Failed to load emails:", error)
        setEmailError(error instanceof Error ? error.message : "Failed to load emails")
        setEmails([])
      } finally {
        setIsLoadingEmails(false)
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
      emailsToScan = emails.filter(email => !email.isPhishing)
    } else if (scanMode === "selected") {
      emailsToScan = emails.filter(email => email.selected)
    }
    console.log("Emails to scan:", emailsToScan)
    // Prepare payload with all emails in a list
    const payload = {
      emails: emailsToScan.map(email => ({
        id: email.id,
        body: email.body,
        subject: email.subject,
        urls: Array.isArray(email.urls) ? email.urls.join(', ') : email.urls || "",
        sender: email.sender_email,
      }))
    }
    
    console.log("Scanning emails:", payload)    
    try {
      const res = await fetch(`${backendUrl}/check-phishing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      console.log("Scan response Result:", res)
      if (!res.ok) throw new Error("Scan failed")
      
      const results = await res.json()
      setEmails(prevEmails =>
        prevEmails.map(email => {
          const scanResult = results.find((result: any) => result.id === email.id)
          if (scanResult) {
            return {
              ...email,
              phishingScore: scanResult.phishingScore,
              isPhishing: scanResult.isPhishing
            }
          }
          return email
        })
      )
    } catch (error) {
      console.error("Scan failed:", error)
      // Reset phishing scores on error
      setEmails(prevEmails =>
        prevEmails.map(email => ({
          ...email,
          phishingScore: 0,
          isPhishing: false
        }))
      )
    }
    
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsScanning(false)
    setShowResults(true)
  }

  const handleEmailSelect = (emailId: string) => {
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
  const safeEmails = emails.filter((email) => !email.isPhishing)
  const selectedEmails = emails.filter((email) => email.selected)
  
  const filteredEmails = activeTab === "all" 
    ? emails
    : activeTab === "phishing" 
      ? phishingEmails 
      : activeTab === "safe" 
        ? safeEmails 
        : selectedEmails

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 border-r bg-white">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 px-6 py-4 border-b">
              <div className="p-1.5 bg-blue-600 rounded text-white">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">PhishGuard</h1>
                <p className="text-xs text-gray-500">Email Security Dashboard</p>
              </div>
            </div>

            <nav className="flex-1 space-y-2 px-4 py-6">
              <div className="space-y-1.5">
                <h2 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Scan Options
                </h2>
                <Separator className="my-2" />
                <Button
                  variant={scanMode === "all" ? "default" : "ghost"}
                  size="sm"
                  className={`w-full justify-start text-sm h-10 ${
                    scanMode === "all" ? "" : "text-gray-700"
                  }`}
                  onClick={() => setScanMode("all")}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Scan All Emails
                </Button>
                <Button
                  variant={scanMode === "unread" ? "default" : "ghost"}
                  size="sm"
                  className={`w-full justify-start text-sm h-10 ${
                    scanMode === "unread" ? "" : "text-gray-700"
                  }`}
                  onClick={() => setScanMode("unread")}
                >
                  <MailOpen className="w-4 h-4 mr-2" />
                  Scan Unread Emails
                </Button>
                <Button
                  variant={scanMode === "selected" ? "default" : "ghost"}
                  size="sm"
                  className={`w-full justify-start text-sm h-10 ${
                    scanMode === "selected" ? "" : "text-gray-700"
                  }`}
                  onClick={() => setScanMode("selected")}
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Scan Selected Emails
                </Button>
              </div>

              <div className="mt-8 space-y-1.5">
                <h2 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Statistics
                </h2>
                <Separator className="my-2" />
                <div className="bg-gray-50 rounded-md p-3">
                  <dl className="grid grid-cols-1 gap-1">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Total Emails:</dt>
                      <dd className="text-sm font-medium">{emails.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Phishing Detected:</dt>
                      <dd className={`text-sm font-medium ${phishingEmails.length > 0 ? 'text-red-500' : ''}`}>
                        {phishingEmails.length}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Selected:</dt>
                      <dd className="text-sm font-medium">{selectedEmails.length}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </nav>

            <div className="p-4 border-t">
              <Button 
                onClick={handleScan} 
                disabled={isScanning} 
                className="w-full"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4 mr-2" />
                    <span>Start Scan</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden absolute top-4 left-4 z-50">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 px-6 py-4 border-b">
                <div className="p-1.5 bg-blue-600 rounded text-white">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="font-semibold text-lg">PhishGuard</h1>
                  <p className="text-xs text-gray-500">Email Security</p>
                </div>
              </div>

              <nav className="flex-1 space-y-2 px-4 py-6">
                <div className="space-y-1.5">
                  <h2 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Scan Options
                  </h2>
                  <Separator className="my-2" />
                  <Button
                    variant={scanMode === "all" ? "default" : "ghost"}
                    size="sm"
                    className={`w-full justify-start text-sm h-10 ${
                      scanMode === "all" ? "" : "text-gray-700"
                    }`}
                    onClick={() => setScanMode("all")}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Scan All Emails
                  </Button>
                  <Button
                    variant={scanMode === "unread" ? "default" : "ghost"}
                    size="sm"
                    className={`w-full justify-start text-sm h-10 ${
                      scanMode === "unread" ? "" : "text-gray-700"
                    }`}
                    onClick={() => setScanMode("unread")}
                  >
                    <MailOpen className="w-4 h-4 mr-2" />
                    Scan Unread Emails
                  </Button>
                  <Button
                    variant={scanMode === "selected" ? "default" : "ghost"}
                    size="sm"
                    className={`w-full justify-start text-sm h-10 ${
                      scanMode === "selected" ? "" : "text-gray-700"
                    }`}
                    onClick={() => setScanMode("selected")}
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Scan Selected Emails
                  </Button>
                </div>

                <div className="mt-8 space-y-1.5">
                  <h2 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Statistics
                  </h2>
                  <Separator className="my-2" />
                  <div className="bg-gray-50 rounded-md p-3">
                    <dl className="grid grid-cols-1 gap-1">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Total Emails:</dt>
                        <dd className="text-sm font-medium">{emails.length}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Phishing Detected:</dt>
                        <dd className={`text-sm font-medium ${phishingEmails.length > 0 ? 'text-red-500' : ''}`}>
                          {phishingEmails.length}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Selected:</dt>
                        <dd className="text-sm font-medium">{selectedEmails.length}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </nav>

              <div className="p-4 border-t">
                <Button 
                  onClick={handleScan} 
                  disabled={isScanning} 
                  className="w-full"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4 mr-2" />
                      <span>Start Scan</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <header className="bg-white border-b sticky top-0 z-30">
            <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
              <div className="lg:hidden"></div> {/* Spacer for mobile */}
              <h1 className="text-xl font-semibold">Email Security Dashboard</h1>
              <div className="hidden sm:flex gap-2 ml-auto lg:ml-0">
                <Button 
                  onClick={handleScan} 
                  disabled={isScanning}
                  className="lg:hidden"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4 mr-2" />
                      <span>Start Scan</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 bg-gray-50">
            {isLoadingEmails ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center min-h-[500px]"
              >
                <div className="relative mb-4">
                  <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
                  <div className="absolute inset-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading your emails...</h2>
                <p className="text-gray-600 text-center">Please wait while we securely fetch your inbox</p>
              </motion.div>
            ) : emailError ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center min-h-[500px]"
              >
                <div className="p-4 bg-red-100 rounded-full mb-4">
                  <AlertTriangle className="h-12 w-12 text-red-500" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Failed to load emails</h2>
                <p className="text-gray-600 mb-6 text-center max-w-md">{emailError}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="bg-blue-600 hover:bg-blue-700 transition-all"
                >
                  Try Again
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Total Emails</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{emails.length}</div>
                      <p className="text-xs text-gray-500 mt-1">In your inbox</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Phishing Detected</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center">
                        <div className={`text-3xl font-bold ${phishingEmails.length > 0 ? 'text-red-600' : ''}`}>{phishingEmails.length}</div>
                        {phishingEmails.length > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            Risk
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Potentially dangerous</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Selected Emails</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{selectedEmails.length}</div>
                      <p className="text-xs text-gray-500 mt-1">Ready to scan</p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Email List */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-0">
                    <div className="flex items-center justify-between">
                      <CardTitle>Inbox</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="hidden sm:flex">
                          {scanMode === "all" && "Scanning all emails"}
                          {scanMode === "unread" && "Scanning unread emails"}
                          {scanMode === "selected" && "Scanning selected emails"}
                        </Badge>
                        <Button 
                          onClick={handleScan} 
                          disabled={isScanning}
                          size="sm"
                          className="sm:hidden"
                        >
                          {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Tabs 
                      defaultValue="all" 
                      className="mt-4"
                      onValueChange={setActiveTab}
                      value={activeTab}
                    >
                      <TabsList className="grid grid-cols-4">
                        <TabsTrigger value="all">All ({emails.length})</TabsTrigger>
                        <TabsTrigger value="phishing" className={phishingEmails.length > 0 ? 'text-red-500' : ''}>
                          Phishing ({phishingEmails.length})
                        </TabsTrigger>
                        <TabsTrigger value="safe">Safe ({safeEmails.length})</TabsTrigger>
                        <TabsTrigger value="selected">Selected ({selectedEmails.length})</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </CardHeader>
                  <CardContent className="pt-4 px-0">
                    {filteredEmails.length === 0 ? (
                      <div className="py-10 text-center text-gray-500">
                        <div className="bg-gray-100 p-3 rounded-full inline-block mb-3">
                          <Mail className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-lg">No emails found</p>
                        {activeTab === "phishing" && <p className="text-sm mt-1">Good news! No phishing emails detected.</p>}
                        {activeTab === "selected" && <p className="text-sm mt-1">Select emails to scan them specifically.</p>}
                      </div>
                    ) : (
                      <ScrollArea className="h-[calc(100vh-400px)] min-h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {scanMode === "selected" && (
                                <TableHead className="w-[50px]">
                                  <span className="sr-only">Select</span>
                                </TableHead>
                              )}
                              <TableHead className="w-[250px]">Sender</TableHead>
                              <TableHead>Subject</TableHead>
                              <TableHead className="hidden lg:table-cell">Preview</TableHead>
                              <TableHead className="w-[100px] text-center">Risk</TableHead>
                              <TableHead className="w-[80px] text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredEmails.map((email, idx) => (
                              <TableRow
                                key={email.id ?? idx}
                                className={email.isPhishing ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}
                              >
                                {scanMode === "selected" && (
                                  <TableCell>
                                    <Checkbox 
                                      checked={email.selected} 
                                      onCheckedChange={() => handleEmailSelect(email.id)}
                                      aria-label="Select email"
                                    />
                                  </TableCell>
                                )}
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="bg-blue-100 text-blue-600">
                                        {email.sender.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium">{email.sender}</p>
                                      <p className="text-xs text-gray-500 truncate max-w-[180px]">{email.sender_email}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <p className="text-sm font-medium truncate max-w-[200px]">{email.subject}</p>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                  <p className="text-sm text-gray-500 truncate max-w-[300px]">{email.preview}</p>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={email.isPhishing 
                                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                                    : getScoreColor(email.phishingScore)}
                                  >
                                    {email.isPhishing ? (
                                      <>
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        High
                                      </>
                                    ) : (
                                      email.phishingScore > 0 ? `${email.phishingScore}/100` : "—"
                                    )}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPreviewEmail(email)}
                                  >
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </main>
        </div>
      </div>

      {/* Email Preview Modal */}
      {previewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] my-8 relative flex flex-col"
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-4 rounded-t-xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-8 w-8 border">
                      <AvatarFallback className="bg-blue-100 text-blue-600 uppercase">
                        {previewEmail.sender.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{previewEmail.sender}</div>
                      <div className="text-xs text-gray-500">{previewEmail.sender_email}</div>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mt-2">{previewEmail.subject}</h3>
                </div>
                <button
                  onClick={() => setPreviewEmail(null)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close preview"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              {previewEmail.isPhishing && (
                <div className="mt-3 p-2.5 bg-red-50 border border-red-100 rounded-md text-red-800 text-sm flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Warning: This email has been detected as potentially malicious</p>
                    <p className="mt-1 text-red-700 text-xs">Exercise caution with any links or attachments in this email.</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Email Body */}
            <ScrollArea className="flex-1 p-4">
              <div 
                className="prose prose-sm sm:prose max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ 
                  __html: previewEmail.body.includes('<') && previewEmail.body.includes('>') 
                    ? previewEmail.body 
                    : previewEmail.body.replace(/\n/g, '<br/>') 
                }}
              />
              
              {previewEmail.urls && previewEmail.urls.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-2">Detected URLs ({previewEmail.urls.length})</h4>
                  <div className="space-y-1">
                    {previewEmail.urls.map((url, idx) => (
                      <div key={idx} className="text-xs p-2 bg-gray-50 rounded border border-gray-200 break-all">
                        {url}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
            
            {/* Modal Footer */}
            <div className="border-t border-gray-100 p-4 bg-gray-50 flex justify-between rounded-b-xl">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setPreviewEmail(null)}
              >
                Close
              </Button>
              
              {previewEmail.isPhishing && (
                <Button 
                  variant="destructive" 
                  size="sm"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Mark as Dangerous
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      <ScanResultsModal
        open={showResults}
        onOpenChange={setShowResults}
        phishingEmails={phishingEmails}
        totalEmails={emails.length}
      />
    </div>
  )
}