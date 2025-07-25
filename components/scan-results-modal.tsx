"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Download, Trash2, Flag, Eye, EyeOff, CheckCircle, XCircle, Shield } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface PhishingEmail {
  id: string | number
  sender: string
  subject: string
  date: string
  preview: string
  phishingScore: number
  isPhishing: boolean
  body?: string
}

interface ScanResultsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  phishingEmails: PhishingEmail[]
  totalEmails: number
}

export function ScanResultsModal({ open, onOpenChange, phishingEmails, totalEmails }: ScanResultsModalProps) {
  const [expandedEmails, setExpandedEmails] = useState<Set<string | number>>(new Set())

  const toggleExpanded = (emailId: string | number) => {
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-lg p-6 shadow-xl border-0">
        <DialogHeader className="mb-6">
          <DialogTitle className="flex items-center space-x-3 text-xl">
            <div className="p-2 bg-blue-100 rounded-full">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <span>Email Security Scan Results</span>
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Scan complete. We analyzed {totalEmails} emails and found {phishingEmails.length} potential threats.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Summary Cards with animation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-50 rounded-full">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Total Scanned</p>
                    <p className="text-2xl font-bold text-gray-900">{totalEmails}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-red-50 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Threats Detected</p>
                    <p className="text-2xl font-bold text-red-600">{phishingEmails.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-green-50 rounded-full">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Safe Emails</p>
                    <p className="text-2xl font-bold text-green-600">{totalEmails - phishingEmails.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Buttons with hover effect */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={downloadReport}
              variant="outline"
              size="sm"
              className="border-blue-200 hover:bg-blue-50 transition-colors duration-300 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </div>

          <Separator className="my-6" />

          {/* Flagged Emails with animations */}
          {phishingEmails.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                Flagged Emails ({phishingEmails.length})
              </h3>

              <div className="space-y-4">
                {phishingEmails.map((email, index) => (
                  <motion.div
                    key={email.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                  >
                    <Card className="overflow-hidden border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-3 bg-gradient-to-r from-red-50 to-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base font-medium text-gray-900 truncate flex items-center">
                              <AlertTriangle className="w-4 h-4 text-red-600 mr-2 flex-shrink-0" />
                              {email.subject}
                            </CardTitle>
                            <p className="text-sm text-gray-600 mt-1 truncate">
                              From: {email.sender}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                              Risk Score: {email.phishingScore}/100
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(email.id)}
                              className="hover:bg-gray-100 transition-colors"
                            >
                              {expandedEmails.has(email.id) ?
                                <EyeOff className="w-4 h-4 text-gray-600" /> :
                                <Eye className="w-4 h-4 text-blue-600" />
                              }
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <AnimatePresence>
                        {expandedEmails.has(email.id) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <CardContent className="pt-4">
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <p className="text-sm text-gray-700 mb-6 whitespace-pre-line leading-relaxed">
                                  {email.body || email.preview}
                                </p>

                                <div className="flex flex-wrap gap-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-red-200 hover:bg-red-50 text-red-700 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Email
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-blue-200 hover:bg-blue-50 transition-colors"
                                  >
                                    <Flag className="w-4 h-4 mr-2" />
                                    Report Phishing
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center py-12 bg-green-50 rounded-lg"
            >
              <div className="p-4 bg-green-100 rounded-full inline-flex">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-2">All Clear!</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Good news! All your emails passed our security checks. No phishing emails were detected.
              </p>
            </motion.div>
          )}
        </div>

        <div className="flex justify-end pt-6 border-t mt-6">
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
