import { useState, useEffect } from 'react';
import { disputesAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Clock, CheckCircle2, MessageSquare, Plus, Loader2, ChevronRight, Gavel } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function DisputesPage() {
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDispute, setSelectedDispute] = useState(null);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const { user } = useAuth();

    useEffect(() => {
        fetchDisputes();
    }, []);

    const fetchDisputes = async () => {
        try {
            const res = await disputesAPI.getMy();
            setDisputes(res.data.disputes);
        } catch (err) {
            toast.error('Failed to fetch disputes');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        setSending(true);
        try {
            await disputesAPI.respond(selectedDispute._id, { message });
            setMessage('');
            // Refresh detailed view
            const res = await disputesAPI.getOne(selectedDispute._id);
            setSelectedDispute(res.data.dispute);
            toast.success('Response sent');
        } catch (err) {
            toast.error('Failed to send response');
        } finally {
            setSending(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'open': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'under_review': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'resolved': return 'bg-green-50 text-green-600 border-green-100';
            case 'closed': return 'bg-surface-50 text-surface-500 border-surface-100';
            default: return 'bg-surface-50 text-surface-500';
        }
    };

    if (loading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Left Sidebar - List */}
                <div className="w-full md:w-1/3 lg:w-1/4 space-y-4">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
                            <Gavel className="w-6 h-6 text-primary-500" /> Resolution Center
                        </h1>
                    </div>

                    {disputes.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-3xl border border-surface-100 border-dashed">
                            <div className="w-12 h-12 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <AlertCircle className="w-6 h-6 text-surface-400" />
                            </div>
                            <p className="text-surface-500">No disputes found</p>
                        </div>
                    ) : (
                        <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-200px)]">
                            {disputes.map(dispute => (
                                <button
                                    key={dispute._id}
                                    onClick={async () => {
                                        setLoading(true);
                                        const res = await disputesAPI.getOne(dispute._id);
                                        setSelectedDispute(res.data.dispute);
                                        setLoading(false);
                                    }}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedDispute?._id === dispute._id
                                            ? 'bg-primary-50 border-primary-200 ring-2 ring-primary-500/10'
                                            : 'bg-white border-surface-100 hover:border-primary-200'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${getStatusStyle(dispute.status)}`}>
                                            {dispute.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-[10px] text-surface-400 font-medium tracking-tight uppercase">
                                            {format(new Date(dispute.createdAt), 'MMM d')}
                                        </span>
                                    </div>
                                    <p className="font-bold text-surface-900 truncate mb-1">{dispute.booking?.listing?.title || 'Unknown Item'}</p>
                                    <p className="text-xs text-surface-500 line-clamp-1">{dispute.reason.replace('_', ' ')}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Panel - Detail & Chat */}
                <div className="flex-1">
                    {selectedDispute ? (
                        <div className="bg-white rounded-3xl border border-surface-100 overflow-hidden shadow-sm flex flex-col h-[calc(100vh-140px)]">
                            {/* Header */}
                            <div className="p-6 border-b border-surface-100 bg-surface-50/50">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-surface-900 mb-1">
                                            Dispute: {selectedDispute.reason.replace('_', ' ')}
                                        </h2>
                                        <p className="text-sm text-surface-500 flex items-center gap-1">
                                            Case ID: <span className="font-mono text-xs">{selectedDispute._id}</span>
                                        </p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusStyle(selectedDispute.status)}`}>
                                        {selectedDispute.status.toUpperCase().replace('_', ' ')}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm font-medium text-surface-600">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-surface-400" /> Opened {format(new Date(selectedDispute.createdAt), 'MMM d, p')}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <AlertCircle className="w-4 h-4 text-surface-400" /> Raised by {selectedDispute.raisedBy.name}
                                    </div>
                                </div>
                            </div>

                            {/* Conversation / Timeline */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Initial Description */}
                                <div className="bg-surface-50 rounded-2xl p-4 border border-surface-100 italic text-surface-700">
                                    "{selectedDispute.description}"
                                </div>

                                {(selectedDispute.responses || []).map((resp, i) => (
                                    <div key={i} className={`flex flex-col ${resp.user._id === user._id ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${resp.user._id === user._id
                                                ? 'bg-primary-600 text-white rounded-tr-none'
                                                : 'bg-white border border-surface-100 rounded-tl-none'
                                            }`}>
                                            <p className="text-[13px] font-medium leading-relaxed">{resp.message}</p>
                                            <p className={`text-[10px] mt-2 font-bold ${resp.user._id === user._id ? 'text-primary-200' : 'text-surface-400'}`}>
                                                {resp.user.name} • {format(new Date(resp.timestamp), 'p')}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {selectedDispute.status === 'resolved' && (
                                    <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                                        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                                        <h3 className="text-lg font-bold text-green-900 mb-2">Resolution Reached</h3>
                                        <p className="text-green-800">{selectedDispute.resolution.decision}</p>
                                        {selectedDispute.resolution.refundAmount > 0 && (
                                            <p className="font-bold text-green-900 mt-2">Refund amount: ₹{selectedDispute.resolution.refundAmount}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Message Box */}
                            {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'closed' && (
                                <form onSubmit={handleSendMessage} className="p-4 border-t border-surface-100 bg-white">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Type your response to the dispute..."
                                            className="flex-1 h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        />
                                        <button
                                            type="submit"
                                            disabled={sending || !message.trim()}
                                            className="w-12 h-12 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 disabled:opacity-50 transition-all shadow-md shadow-primary-500/20"
                                        >
                                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-center p-8 bg-white/50 rounded-3xl border border-surface-100 border-dashed">
                            <div>
                                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-4">
                                    <Gavel className="w-10 h-10 text-primary-500" />
                                </div>
                                <h3 className="text-xl font-bold text-surface-900 mb-2">Select a Case</h3>
                                <p className="text-surface-500 max-w-sm">
                                    Choose a dispute from the left to view details, timeline, and chat with the other party.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
