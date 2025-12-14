import React, { useEffect, useState } from 'react';
import { api, fmtBDTEn } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Building2, 
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  X,
  Calendar,
  DollarSign,
  FileText
} from 'lucide-react';

export default function BankManage() {
  const { user } = useAuth();
  
  if (!['Accountant','Admin','SuperAdmin'].includes(user?.role)) {
    return <div className="text-royal">Only Accountant, Admin or SuperAdmin can access this page.</div>;
  }

  const [balances, setBalances] = useState({ bankBalance: 0, pettyCash: 0 });
  const [transactions, setTransactions] = useState([]);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [showAddPurposeModal, setShowAddPurposeModal] = useState(false);
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);
  const [newSource, setNewSource] = useState('');
  const [newPurpose, setNewPurpose] = useState('');
  
  // Load custom heads from localStorage
  const [customDepositSources, setCustomDepositSources] = useState(() => {
    try {
      const saved = localStorage.getItem('customDepositSources');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [customWithdrawPurposes, setCustomWithdrawPurposes] = useState(() => {
    try {
      const saved = localStorage.getItem('customWithdrawPurposes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [depositForm, setDepositForm] = useState({
    date: new Date().toISOString().slice(0,10),
    depositFrom: '',
    depositFromOther: '',
    amount: '',
    notes: ''
  });

  const [withdrawForm, setWithdrawForm] = useState({
    date: new Date().toISOString().slice(0,10),
    withdrawPurpose: '',
    withdrawPurposeOther: '',
    amount: '',
    notes: ''
  });

  const loadBalances = async () => {
    try {
      const data = await api.getBankBalances();
      setBalances(data);
    } catch (e) {
      setErr(e.message);
    }
  };

  const loadTransactions = async () => {
    try {
      const data = await api.getBankTransactions();
      setTransactions(data.transactions || []);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    loadBalances();
    loadTransactions();
  }, []); // eslint-disable-line

  const handleDeposit = async () => {
    setErr(null); setMsg(null);
    try {
      if (!depositForm.amount || parseFloat(depositForm.amount) <= 0) {
        setErr('Please enter a valid amount');
        return;
      }
      if (!depositForm.depositFrom.trim()) {
        setErr('Please specify the deposit source');
        return;
      }
      await api.depositToBank({
        date: depositForm.date,
        depositFrom: depositForm.depositFrom,
        depositFromOther: depositForm.depositFromOther,
        amount: parseFloat(depositForm.amount),
        notes: depositForm.notes
      });
      setMsg('Deposit successful');
      setShowDepositModal(false);
      setDepositForm({
        date: new Date().toISOString().slice(0,10),
        depositFrom: '',
        depositFromOther: '',
        amount: '',
        notes: ''
      });
      loadBalances();
      loadTransactions();
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleWithdraw = async () => {
    setErr(null); setMsg(null);
    try {
      if (!withdrawForm.amount || parseFloat(withdrawForm.amount) <= 0) {
        setErr('Please enter a valid amount');
        return;
      }
      if (!withdrawForm.withdrawPurpose.trim()) {
        setErr('Please specify the withdrawal purpose');
        return;
      }
      await api.withdrawFromBank({
        date: withdrawForm.date,
        withdrawPurpose: withdrawForm.withdrawPurpose,
        withdrawPurposeOther: withdrawForm.withdrawPurposeOther,
        amount: parseFloat(withdrawForm.amount),
        notes: withdrawForm.notes
      });
      setMsg('Withdrawal successful');
      setShowWithdrawModal(false);
      setWithdrawForm({
        date: new Date().toISOString().slice(0,10),
        withdrawPurpose: '',
        withdrawPurposeOther: '',
        amount: '',
        notes: ''
      });
      loadBalances();
      loadTransactions();
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleAddSource = () => {
    if (!newSource.trim()) {
      setErr('Please enter a source name');
      return;
    }
    const updated = [...customDepositSources, newSource.trim()];
    setCustomDepositSources(updated);
    localStorage.setItem('customDepositSources', JSON.stringify(updated));
    setNewSource('');
    setShowAddSourceModal(false);
    setMsg(`Added "${newSource.trim()}" to deposit sources`);
  };

  const handleAddPurpose = () => {
    if (!newPurpose.trim()) {
      setErr('Please enter a purpose name');
      return;
    }
    const updated = [...customWithdrawPurposes, newPurpose.trim()];
    setCustomWithdrawPurposes(updated);
    localStorage.setItem('customWithdrawPurposes', JSON.stringify(updated));
    setNewPurpose('');
    setShowAddPurposeModal(false);
    setMsg(`Added "${newPurpose.trim()}" to withdrawal purposes`);
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Cash Management
          </h1>
          <p className="text-gray-600 mt-1">Manage cash flow, deposits and withdrawals</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDepositModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-lg"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Deposit into Bank
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 transition-all font-medium shadow-lg"
          >
            <ArrowUpFromLine className="w-4 h-4" />
            Withdraw from Bank
          </button>
        </div>
      </div>

      {/* Messages */}
      {err && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-red-700 font-medium">{err}</p>
        </div>
      )}
      {msg && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
          <p className="text-green-700 font-medium">{msg}</p>
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bank Balance */}
        <div className="group relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-sm font-medium mb-2">Balance in Bank</p>
            <h3 className={`text-3xl font-bold ${balances.bankBalance < 0 ? 'text-red-200' : 'text-white'}`}>
              {fmtBDTEn(balances.bankBalance || 0)}
            </h3>
            {balances.bankBalance < 0 && (
              <p className="text-red-200 text-xs mt-1">Overdraft</p>
            )}
          </div>
        </div>

        {/* Petty Cash */}
        <div className="group relative bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                <Wallet className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-sm font-medium mb-2">Petty Cash</p>
            <h3 className="text-3xl font-bold text-white">{fmtBDTEn(balances.pettyCash || 0)}</h3>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Transactions</h2>
        
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Details</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Balance After</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={t._id || i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">
                      {new Date(t.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {t.type === 'deposit' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          <ArrowDownToLine className="w-3 h-3" />
                          Deposit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                          <ArrowUpFromLine className="w-3 h-3" />
                          Withdraw
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {t.type === 'deposit' ? (
                        <>From: {t.depositFrom || 'N/A'}</>
                      ) : (
                        <>For: {t.withdrawPurpose || 'N/A'}</>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {t.type === 'deposit' ? (
                        <span className="text-green-600">+{fmtBDTEn(t.amount)}</span>
                      ) : (
                        <span className="text-red-600">-{fmtBDTEn(t.amount)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      {fmtBDTEn(t.balanceAfter)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {t.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDepositModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Deposit into Bank
              </h2>
              <button
                onClick={() => setShowDepositModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={depositForm.date}
                  onChange={e => setDepositForm({ ...depositForm, date: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    <ArrowDownToLine className="w-4 h-4 inline mr-1" />
                    Deposit From (Head)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddSourceModal(true)}
                    className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Source
                  </button>
                </div>
                <input
                  type="text"
                  value={depositForm.depositFrom}
                  onChange={e => setDepositForm({ ...depositForm, depositFrom: e.target.value })}
                  placeholder="e.g., Petty Cash, Course Fee, Recruitment Income, etc."
                  list="deposit-sources"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
                />
                <datalist id="deposit-sources">
                  <option value="Petty Cash" />
                  <option value="Admission Fees" />
                  <option value="Due Collection" />
                  <option value="Recruitment Income" />
                  <option value="Course Fees" />
                  <option value="Other Income" />
                  {customDepositSources.map((source, idx) => (
                    <option key={idx} value={source} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Amount
                </label>
                <input
                  type="number"
                  value={depositForm.amount}
                  onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Additional Notes
                </label>
                <textarea
                  value={depositForm.notes}
                  onChange={e => setDepositForm({ ...depositForm, notes: e.target.value })}
                  placeholder="Optional notes..."
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-lg"
              >
                Deposit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowWithdrawModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                Withdraw from Bank
              </h2>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={withdrawForm.date}
                  onChange={e => setWithdrawForm({ ...withdrawForm, date: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    <ArrowUpFromLine className="w-4 h-4 inline mr-1" />
                    Purpose of Withdraw (Head)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddPurposeModal(true)}
                    className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Purpose
                  </button>
                </div>
                <input
                  type="text"
                  value={withdrawForm.withdrawPurpose}
                  onChange={e => setWithdrawForm({ ...withdrawForm, withdrawPurpose: e.target.value })}
                  placeholder="e.g., Petty Cash, Employee Salary, Office Rent, etc."
                  list="withdraw-purposes"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
                />
                <datalist id="withdraw-purposes">
                  <option value="Petty Cash" />
                  <option value="Employee Salary" />
                  <option value="Office Rent" />
                  <option value="Utilities" />
                  <option value="Goods Purchase" />
                  <option value="Office Supplies" />
                  <option value="Marketing Expense" />
                  <option value="Other Expense" />
                  {customWithdrawPurposes.map((purpose, idx) => (
                    <option key={idx} value={purpose} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Amount
                </label>
                <input
                  type="number"
                  value={withdrawForm.amount}
                  onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Additional Notes
                </label>
                <textarea
                  value={withdrawForm.notes}
                  onChange={e => setWithdrawForm({ ...withdrawForm, notes: e.target.value })}
                  placeholder="Optional notes..."
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 transition-all font-medium shadow-lg"
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Deposit Source Modal */}
      {showAddSourceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddSourceModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                Add Deposit Source
              </h2>
              <button
                onClick={() => setShowAddSourceModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source Name
                </label>
                <input
                  type="text"
                  value={newSource}
                  onChange={e => setNewSource(e.target.value)}
                  placeholder="e.g., Workshop Fees, Consulting Income"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
                  onKeyDown={e => e.key === 'Enter' && handleAddSource()}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAddSourceModal(false)}
                className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSource}
                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-lg"
              >
                Add Source
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Withdraw Purpose Modal */}
      {showAddPurposeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddPurposeModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                Add Withdrawal Purpose
              </h2>
              <button
                onClick={() => setShowAddPurposeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose Name
                </label>
                <input
                  type="text"
                  value={newPurpose}
                  onChange={e => setNewPurpose(e.target.value)}
                  placeholder="e.g., Equipment Purchase, Travel Expense"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
                  onKeyDown={e => e.key === 'Enter' && handleAddPurpose()}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAddPurposeModal(false)}
                className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPurpose}
                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 transition-all font-medium shadow-lg"
              >
                Add Purpose
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
