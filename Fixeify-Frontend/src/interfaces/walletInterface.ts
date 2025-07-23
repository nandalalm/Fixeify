export interface ITransaction {
  _id: string; // Unique identifier for each transaction, mapped from MongoDB ObjectId
  amount: number;
  type: "credit" | "debit";
  date: Date;
}

export interface WalletResponse {
  id: string;
  proId: string;
  balance: number;
  transactions: ITransaction[];
  createdAt: Date;
  updatedAt: Date;
}