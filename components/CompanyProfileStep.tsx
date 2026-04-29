'use client';

import { useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';

import type { Schema } from '@/amplify/data/resource';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useToast } from '@/lib/toast-context';
import { companyProfileStepSchema, validate } from '@/lib/validation';
import type { FormErrors } from '@/lib/validation';

interface CompanyProfileStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function CompanyProfileStep({ onComplete, onSkip }: CompanyProfileStepProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const toast = useToast();
  const dark = theme === 'dark';

  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = validate(companyProfileStepSchema, {
      companyName,
      gstNumber: gstNumber || '',
      bankAccount: bankAccount || '',
    });

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    setSubmitting(true);

    try {
      const client = generateClient<Schema>();

      // Create User record if it doesn't exist (e.g. Google sign-in users)
      if (user) {
        try {
          const { data: existingUsers } = await client.models.User.list();
          if (!existingUsers || existingUsers.length === 0) {
            await client.models.User.create({
              email: user.email,
              firstName: user.firstName || '',
              lastName: user.lastName || '',
            });
          }
        } catch (userError) {
          console.error('Failed to check/create User record:', userError);
        }
      }

      // Fetch the User record to get its ID for the CompanyProfile relationship
      const { data: users } = await client.models.User.list();
      const userId = users?.[0]?.id;

      if (!userId) {
        throw new Error('Unable to find user record');
      }

      await client.models.CompanyProfile.create({
        companyName: result.data.companyName,
        gstNumber: result.data.gstNumber || undefined,
        bankAccount: result.data.bankAccount || undefined,
        defaultCurrency: 'NZD',
        defaultGstRate: 15,
        companyCountry: 'New Zealand',
        userId,
      });

      onComplete();
    } catch (err) {
      console.error('Failed to create company profile:', err);
      toast.error('Failed to save company profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClasses = (fieldName: string) =>
    `mt-1 block w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
      errors[fieldName]
        ? 'border-red-500'
        : dark
          ? 'border-slate-700'
          : 'border-gray-300'
    } ${
      dark
        ? 'bg-slate-800 text-white placeholder:text-slate-500'
        : 'bg-white text-gray-900 placeholder:text-gray-400'
    }`;

  const labelClasses = `block text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`;

  return (
    <div className={`max-w-md w-full space-y-8 p-8 rounded-xl ${
      dark
        ? 'bg-slate-900 border border-purple-500/30'
        : 'bg-white border-2 border-indigo-600'
    }`}>
      <div className="text-center">
        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          dark ? 'bg-primary-500/20' : 'bg-primary-50'
        }`}>
          <Building2 className={`w-6 h-6 ${dark ? 'text-primary-400' : 'text-primary-600'}`} />
        </div>
        <h2 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
          Set up your business
        </h2>
        <p className={`mt-2 text-sm ${dark ? 'text-slate-400' : 'text-gray-600'}`}>
          Tell us about your company to get started with invoicing
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="companyName" className={labelClasses}>
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className={inputClasses('companyName')}
            placeholder="Your business name"
            aria-invalid={!!errors.companyName}
            aria-describedby={errors.companyName ? 'companyName-error' : undefined}
          />
          {errors.companyName && (
            <p id="companyName-error" role="alert" aria-live="assertive" className="mt-1 text-sm text-red-500">
              {errors.companyName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="gstNumber" className={labelClasses}>
            GST Number
          </label>
          <input
            id="gstNumber"
            type="text"
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value)}
            className={inputClasses('gstNumber')}
            placeholder="12-345-678"
            aria-invalid={!!errors.gstNumber}
            aria-describedby={errors.gstNumber ? 'gstNumber-error' : undefined}
          />
          {errors.gstNumber && (
            <p id="gstNumber-error" role="alert" aria-live="assertive" className="mt-1 text-sm text-red-500">
              {errors.gstNumber}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="bankAccount" className={labelClasses}>
            Bank Account
          </label>
          <input
            id="bankAccount"
            type="text"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            className={inputClasses('bankAccount')}
            placeholder="06-0123-0456789-00"
            aria-invalid={!!errors.bankAccount}
            aria-describedby={errors.bankAccount ? 'bankAccount-error' : undefined}
          />
          {errors.bankAccount && (
            <p id="bankAccount-error" role="alert" aria-live="assertive" className="mt-1 text-sm text-red-500">
              {errors.bankAccount}
            </p>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up...
              </>
            ) : (
              'Complete Setup'
            )}
          </button>

          <button
            type="button"
            onClick={onSkip}
            disabled={submitting}
            className={`w-full font-medium py-3 rounded-lg transition-colors disabled:opacity-50 ${
              dark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Skip for now
          </button>
        </div>
      </form>
    </div>
  );
}
