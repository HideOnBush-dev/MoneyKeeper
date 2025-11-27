import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, Plus, ArrowUpRight, ArrowDownLeft,
    Check, UserPlus, MoreVertical, Trash2
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { splitsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';
import { useTranslation } from 'react-i18next';

const Splits = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('balances'); // balances, groups
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState([]);
    const [owed, setOwed] = useState({ total_owed: 0, details: [] });
    const [owing, setOwing] = useState({ total_owing: 0, details: [] });

    // Modals
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);

    // Form data
    const [groupName, setGroupName] = useState('');
    const [memberName, setMemberName] = useState('');
    const [memberEmail, setMemberEmail] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [groupsRes, owedRes, owingRes] = await Promise.all([
                splitsAPI.getGroups(),
                splitsAPI.getOwed(),
                splitsAPI.getOwing()
            ]);

            setGroups(groupsRes.data.groups || []);
            setOwed(owedRes.data);
            setOwing(owingRes.data);
        } catch (error) {
            console.error('Error fetching splits data:', error);
            toast({ type: 'error', message: t('messages.errorOccurred') });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try {
            await splitsAPI.createGroup({ name: groupName });
            toast({ type: 'success', message: t('group.createSuccess') });
            setShowCreateGroup(false);
            setGroupName('');
            fetchData();
        } catch (error) {
            toast({ type: 'error', message: error?.response?.data?.error || t('messages.errorOccurred') });
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!selectedGroup) return;

        try {
            await splitsAPI.addMember(selectedGroup.id, {
                name: memberName,
                email: memberEmail || undefined
            });
            toast({ type: 'success', message: t('group.addMemberSuccess') });
            setShowAddMember(false);
            setMemberName('');
            setMemberEmail('');
            fetchData();
        } catch (error) {
            toast({ type: 'error', message: error?.response?.data?.error || t('messages.errorOccurred') });
        }
    };

    const handleSettle = async (splitId) => {
        if (!window.confirm(t('split.confirmSettle'))) return;

        try {
            await splitsAPI.settle(splitId);
            toast({ type: 'success', message: t('split.settleSuccess') });
            fetchData();
        } catch (error) {
            toast({ type: 'error', message: error?.response?.data?.error || t('messages.errorOccurred') });
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    if (loading) {
        return (
            <div className="space-y-4 max-w-4xl mx-auto px-4 py-6">
                <Skeleton className="h-12 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
                <Skeleton className="h-64" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            <div className="flex justify-between items-center">
                <PageHeader icon={Users} title={t('split.title')} iconColor="from-purple-600 to-pink-600" />
                <Button onClick={() => setShowCreateGroup(true)} icon={Plus}>
                    {t('group.addGroup')}
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-slate-700">
                <button
                    className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'balances'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    onClick={() => setActiveTab('balances')}
                >
                    {t('split.balances')}
                    {activeTab === 'balances' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                    )}
                </button>
                <button
                    className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'groups'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    onClick={() => setActiveTab('groups')}
                >
                    {t('group.title')} ({groups.length})
                    {activeTab === 'groups' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                    )}
                </button>
            </div>

            {activeTab === 'balances' && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-2xl border border-green-100 dark:border-green-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full text-green-600 dark:text-green-300">
                                    <ArrowDownLeft className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-gray-700 dark:text-gray-300">{t('split.youAreOwed')}</h3>
                            </div>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(owed.total_owed)}
                            </p>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-2xl border border-red-100 dark:border-red-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-red-100 dark:bg-red-800 rounded-full text-red-600 dark:text-red-300">
                                    <ArrowUpRight className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-gray-700 dark:text-gray-300">{t('split.youOwe')}</h3>
                            </div>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                {formatCurrency(owing.total_owing)}
                            </p>
                        </div>
                    </div>

                    {/* Details List */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{t('common.details')}</h3>

                        {owed.details.length === 0 && owing.details.length === 0 && (
                            <div className="text-center py-10 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                                <Users className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">{t('split.noPendingSplits')}</p>
                            </div>
                        )}

                        {owed.details.map((item) => (
                            <div key={`owed-${item.id}`} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">{item.debtor_name}</span>
                                        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-500 dark:text-gray-400">
                                            {t('split.owesYou')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {item.expense_name} • {new Date(item.expense_date).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-green-600 dark:text-green-400 mb-1">
                                        {formatCurrency(item.amount)}
                                    </p>
                                    <button
                                        onClick={() => handleSettle(item.id)}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-end gap-1"
                                    >
                                        <Check className="h-3 w-3" />
                                        {t('split.markAsPaid')}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {owing.details.map((item) => (
                            <div key={`owing-${item.id}`} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">Bạn</span>
                                        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-500 dark:text-gray-400">
                                            {t('split.owe')} {item.creditor_name}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {item.expense_name} • {new Date(item.expense_date).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-red-600 dark:text-red-400">
                                        {formatCurrency(item.amount)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'groups' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.length === 0 ? (
                        <div className="col-span-full text-center py-10 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                            <Users className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 mb-4">{t('group.noGroups')}</p>
                            <Button onClick={() => setShowCreateGroup(true)} variant="outline" size="sm">
                                {t('group.createFirstGroup')}
                            </Button>
                        </div>
                    ) : (
                        groups.map((group) => (
                            <div key={group.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{group.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{group.description || t('common.noDescription')}</p>
                                    </div>
                                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                        <MoreVertical className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {t('group.members')} ({group.members.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {group.members.map((member) => (
                                            <div key={member.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-slate-700 rounded-lg text-sm">
                                                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-gray-700 dark:text-gray-300">{member.name}</span>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => {
                                                setSelectedGroup(group);
                                                setShowAddMember(true);
                                            }}
                                            className="flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                                        >
                                            <Plus className="h-3 w-3" />
                                            {t('common.add')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Create Group Modal */}
            <Modal
                isOpen={showCreateGroup}
                onClose={() => setShowCreateGroup(false)}
                title={t('group.addGroup')}
            >
                <form onSubmit={handleCreateGroup} className="space-y-4">
                    <Input
                        label={t('group.groupName')}
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder={t('group.groupNamePlaceholder')}
                        required
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setShowCreateGroup(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit">
                            {t('group.addGroup')}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Add Member Modal */}
            <Modal
                isOpen={showAddMember}
                onClose={() => setShowAddMember(false)}
                title={t('group.addMemberToGroup', { name: selectedGroup?.name })}
            >
                <form onSubmit={handleAddMember} className="space-y-4">
                    <Input
                        label={t('group.memberName')}
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        placeholder={t('group.memberNamePlaceholder')}
                        required
                    />
                    <Input
                        label={t('group.memberEmail')}
                        type="email"
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        placeholder={t('group.memberEmailPlaceholder')}
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setShowAddMember(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit">
                            {t('common.add')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Splits;
