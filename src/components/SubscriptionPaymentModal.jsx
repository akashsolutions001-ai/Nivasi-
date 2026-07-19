import { useState, useEffect } from 'react';
import { X, CreditCard, Banknote, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { SUBSCRIPTION_DURATION_DAYS, getSubscriptionAmount } from '../utils/subscriptionConfig.js';
import { setSubscriptionPaymentFlow } from '../utils/paymentFlow.js';
import { initiatePayment } from '../services/paymentService.js';

const SubscriptionPaymentModal = ({
  room,
  onClose,
  canCollectCash,
  onCashCollected,
  customerName,
  customerEmail,
  paymentSuccess,
  isRenewal,
  onPaymentDone
}) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(paymentSuccess ? 'success' : 'payment');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    if (paymentSuccess) setStep('success');
  }, [paymentSuccess]);

  if (!room) return null;

  const roomType = room.roomType || room.rooms || '1 RK';
  const amount = room.subscriptionAmount ?? getSubscriptionAmount(roomType, room.studentStream || 'engineering');

  const handlePaymentChoice = async (paymentMethod) => {
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      if (paymentMethod === 'cash') {
        if (!canCollectCash || !onCashCollected) {
          throw new Error('Not authorized for cash collection');
        }
        await onCashCollected(room);
        setStep('success');
        return;
      }

      setSubscriptionPaymentFlow({
        path: window.location.pathname,
        roomId: room.id,
        title: room.title,
        roomType
      });

      setStep('redirecting');

      await initiatePayment({
        roomId: room.id,
        roomType,
        studentStream: room.studentStream || 'engineering',
        customerName: customerName || 'Nivasi Host',
        customerEmail: customerEmail || 'payments@nivasi.space',
        customerPhone: room.contact || '9999999999'
      });
    } catch (error) {
      setSubmitMessage(error.message || 'Payment failed');
      setStep('payment');
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    if (onPaymentDone) onPaymentDone();
    onClose();
  };

  const headerTitle =
    step === 'success'
      ? 'Payment Successful'
      : step === 'redirecting'
        ? 'Redirecting to Payment'
        : isRenewal
          ? 'Renew Subscription'
          : 'Subscription Payment';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">{headerTitle}</h2>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting && step === 'redirecting'}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {submitMessage && (
          <div className="mx-6 mt-4 px-4 py-2 rounded-md flex items-center gap-2 bg-red-50 border border-red-200 text-red-800">
            <AlertCircle className="w-4 h-4" />
            {submitMessage}
          </div>
        )}

        {step === 'payment' && (
          <div className="p-6 space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{room.title}</h3>
              <p className="text-sm text-gray-600 mb-4">
                {roomType} · {SUBSCRIPTION_DURATION_DAYS}-day listing subscription
              </p>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-bold text-orange-600">₹{amount}</span>
                <span className="text-sm text-gray-500">
                  {isRenewal ? 'renewal fee' : 'one-time registration fee'}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Choose how you would like to pay for your room listing subscription.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handlePaymentChoice('online')}
                disabled={isSubmitting}
                className="w-full flex items-center gap-4 p-4 border-2 border-orange-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all text-left disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Pay Online</p>
                  <p className="text-sm text-gray-500">Pay securely via Cashfree (UPI, card, netbanking)</p>
                </div>
              </button>

              {canCollectCash && onCashCollected && (
                <button
                  type="button"
                  onClick={() => handlePaymentChoice('cash')}
                  disabled={isSubmitting}
                  className="w-full flex items-center gap-4 p-4 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left disabled:opacity-50"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Banknote className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Cash Collected</p>
                    <p className="text-sm text-gray-500">Mark subscription as paid — cash received in person</p>
                  </div>
                </button>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        )}

        {step === 'redirecting' && (
          <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
            <p className="text-gray-700 font-medium">Redirecting to Cashfree…</p>
            <p className="text-sm text-gray-500">Complete payment in the next screen. You will return here when done.</p>
          </div>
        )}

        {step === 'success' && (
          <div className="p-6 space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Done</h3>
              <p className="text-gray-600">
                {isRenewal
                  ? 'Your listing subscription has been renewed and is active.'
                  : 'Your room listing subscription is active.'}
              </p>
            </div>
            <div className="flex justify-end pt-2 border-t">
              <Button type="button" onClick={handleDone}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPaymentModal;
