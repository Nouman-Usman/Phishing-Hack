"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Download, Trash2, Flag, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"

interface PhishingEmail {
  id: number
  sender: string
  subject: string
  date: string
  preview: string
  phishingScore: number
  isPhishing: boolean
}

interface ScanResultsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  phishingEmails: PhishingEmail[]
  totalEmails: number
}

export function ScanResultsModal({ open, onOpenChange, phishingEmails, totalEmails }: ScanResultsModalProps) {
  const [expandedEmails, setExpandedEmails] = useState<Set<number>>(new Set())

  const toggleExpanded = (emailId: number) => {
    const newExpanded = new Set(expandedEmails)
    if (newExpanded.has(emailId)) {
      newExpanded.delete(emailId)
    } else {
      newExpanded.add(emailId)
    }
    setExpandedEmails(newExpanded)
  }

  const downloadReport = () => {
    const csvContent = [
      ["Sender", "Subject", "Date", "Risk Score", "Status"],
      ...phishingEmails.map((email) => [
        email.sender,
        email.subject,
        email.date,
        email.phishingScore.toString(),
        "Phishing Detected",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "phishing-scan-report.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>Scan Results</span>
          </DialogTitle>
          <DialogDescription>Scan completed. Review the flagged emails below.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Scanned</p>
                    <p className="text-2xl font-bold text-gray-900">{totalEmails}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phishing Detected</p>
                    <p className="text-2xl font-bold text-red-600">{phishingEmails.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <XCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Safe Emails</p>
                    <p className="text-2xl font-bold text-green-600">{totalEmails - phishingEmails.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadReport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </div>

          <Separator />

          {/* Flagged Emails */}
          {phishingEmails.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Flagged Emails ({phishingEmails.length})</h3>

              {phishingEmails.map((email) => (
                <Card key={email.id} className="border-red-200 bg-red-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-medium text-gray-900 truncate">{email.subject}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          From: {email.sender} • {email.date}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Badge variant="destructive">Risk: {email.phishingScore}/100</Badge>
                        <Button variant="ghost" size="sm" onClick={() => toggleExpanded(email.id)}>
                          {expandedEmails.has(email.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {expandedEmails.has(email.id) && (
                    <CardContent className="pt-0">
                      <div className="bg-white rounded-lg p-4 border">
                        <p className="text-sm text-gray-700 mb-4">{email.preview}</p>

                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                          <Button variant="outline" size="sm">
                            <Flag className="w-4 h-4 mr-2" />
                            Report as Phishing
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Phishing Emails Detected</h3>
              <p className="text-gray-600">Your inbox looks safe! All scanned emails passed our security checks.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
