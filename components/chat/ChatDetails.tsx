"use client";
import React from "react";
import { Paperclip, Link as LinkIcon } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";

function extractLinks(text: string) {
    if (!text) return [];
    const urlRegex = /https?:\/\/[^\s]+/g;
    return (text.match(urlRegex) || []).map(u => u.trim());
}

export default function ChatDetails() {
    const { messages, selectedConversation } = useChat();

    // Filter messages for the selected conversation
    const convId = selectedConversation?.conversationId;
    const convMessages = convId ? messages.filter(m => m.conversationId === convId) : [];

    const photos: Array<any> = [];
    const files: Array<any> = [];
    const links: Array<{ url: string; text?: string }> = [];

    convMessages.forEach(msg => {
        // attachments
        if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
            msg.attachments.forEach((att: any) => {
                if (att && att.mime && att.mime.startsWith && att.mime.startsWith('image/')) {
                    photos.push(att);
                } else if (att) {
                    files.push(att);
                }
            });
        }

        // links in content
        const found = extractLinks(msg.content || '');
        found.forEach(u => links.push({ url: u, text: msg.content }));
    });

    return (
        <div className="h-full flex flex-col bg-white p-8 overflow-y-auto">
            <h3 className="text-xl font-bold mb-8">Chat Details</h3>

            {/* Photos Section */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-base font-medium">Photos and Videos</span>
                        <span className="text-gray-400 text-sm">{photos.length}</span>
                    </div>
                    <button className="text-xs text-gray-500 hover:text-black underline">See all</button>
                </div>
                {photos.length === 0 ? (
                    <div className="text-sm text-gray-500">No photos shared yet</div>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {photos.slice(0, 9).map((p, i) => (
                            <a key={i} href={p.url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden block">
                                <img src={p.url} alt={p.filename || 'photo'} className="w-full h-full object-cover" />
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* Shared Files */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-base font-medium">Shared Files</span>
                        <span className="text-gray-400 text-sm">{files.length}</span>
                    </div>
                    <button className="text-xs text-gray-500 hover:text-black underline">See all</button>
                </div>
                {files.length === 0 ? (
                    <div className="text-sm text-gray-500">No files shared yet</div>
                ) : (
                    <div className="space-y-3">
                        {files.slice(0, 20).map((f, i) => (
                            <a key={i} href={f.url} target="_blank" rel="noreferrer" className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <Paperclip className="w-4 h-4 text-gray-600" />
                                </div>
                                <div className="text-xs font-medium text-gray-700 line-clamp-2 leading-relaxed">
                                    {f.filename || f.key || 'file'}
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* Shared Links */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-base font-medium">Shared Links</span>
                        <span className="text-gray-400 text-sm">{links.length}</span>
                    </div>
                    <button className="text-xs text-gray-500 hover:text-black underline">See all</button>
                </div>
                {links.length === 0 ? (
                    <div className="text-sm text-gray-500">No links shared yet</div>
                ) : (
                    <div className="space-y-3">
                        {links.slice(0, 50).map((l, i) => (
                            <a key={i} href={l.url} target="_blank" rel="noreferrer" className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <LinkIcon className="w-4 h-4 text-gray-600" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-900">{new URL(l.url).hostname}</div>
                                    <div className="text-[10px] text-gray-400 break-all leading-tight mt-0.5">{l.url}</div>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}