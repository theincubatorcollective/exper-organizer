export type PayoutMetric = {
  label: string;
  value: string;
  detail: string;
};

export type TransferHistoryItem = {
  id: string;
  primary: string;
  amount: string;
  detail: string;
};

export type CurrencyBalance = {
  id: string;
  flag: string;
  code: string;
  country: string;
  amount: string;
  detail: string;
  needsAttention?: boolean;
};

export type PayoutBankAccount = {
  id: string;
  label: string;
  currency: string;
  isDefault: boolean;
  status: string;
};

export type PayoutBankOption = {
  code: string;
  name: string;
};

export type PayoutExperienceOption = {
  id: string;
  title: string;
};

export type PayoutDatePreset = "all" | "month" | "last30";

export type PayoutsData = {
  eventMeta: string;
  currencies: string[];
  activeCurrency: string;
  eventFilter: string;
  dateFilter: string;
  filters: {
    from: string | null;
    to: string | null;
    experienceId: string | null;
    datePreset: PayoutDatePreset;
  };
  metrics: PayoutMetric[];
  transfer: {
    fromBalance: string;
    bankAccount: string;
    bankAccountId: string | null;
    amount: string;
    availableAmount: number;
    footnote: string;
  };
  history: TransferHistoryItem[];
  balances: CurrencyBalance[];
  bankAccounts: PayoutBankAccount[];
  bankOptions: PayoutBankOption[];
  experiences: PayoutExperienceOption[];
  /** From summary/balances; false when workspace cannot transfer yet. */
  payoutsEnabled: boolean;
  /** Payouts export endpoint is not available yet. */
  exportAvailable: boolean;
};
