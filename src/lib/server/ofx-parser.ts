import OfxPkg from 'ofx-data-extractor';
const { Ofx } = OfxPkg as any;

export interface ParsedTransaction {
	fitId: string;
	transactionType: string;
	datePosted: Date;
	amount: number;
	payee: string;
	memo?: string;
	checkNumber?: string;
}

export interface OFXParseResult {
	accountType: 'BANK' | 'CREDIT_CARD';
	transactions: ParsedTransaction[];
	accountNumber?: string;
	bankId?: string;
	startDate?: Date;
	endDate?: Date;
}

/**
 * Parse OFX/QFX file buffer and extract transaction data
 */
export async function parseOfxFile(fileBuffer: Buffer): Promise<OFXParseResult> {
	try {
		// Parse the OFX file
		const ofx = await Ofx.fromBuffer(fileBuffer);

		// Get account type
		const accountType = ofx.getType() as 'BANK' | 'CREDIT_CARD';

		// Get transaction list
		const bankTransferList = ofx.getBankTransferList();
		const transactions: ParsedTransaction[] = [];

		// Extract transaction data
		if (bankTransferList && Array.isArray(bankTransferList)) {
			for (const txn of bankTransferList) {
				// Parse OFX date format (YYYYMMDDHHMMSS or YYYYMMDD)
				const dateStr = txn.DTPOSTED;
				const year = parseInt(dateStr.substring(0, 4));
				const month = parseInt(dateStr.substring(4, 6)) - 1;
				const day = parseInt(dateStr.substring(6, 8));
				const datePosted = new Date(year, month, day);

				transactions.push({
					fitId: txn.FITID,
					transactionType: txn.TRNTYPE,
					datePosted,
					amount: Math.abs(parseFloat(txn.TRNAMT.toString())), // Use absolute value
					payee: txn.NAME || txn.MEMO || 'Unknown',
					memo: txn.MEMO || undefined,
					checkNumber: txn.CHECKNUM || undefined
				});
			}
		}

		// Get data as JSON for account info
		const ofxData = ofx.toJson();
		const accountInfo = ofxData?.BANKACCTFROM || ofxData?.CCACCTFROM;

		return {
			accountType,
			transactions,
			accountNumber: accountInfo?.ACCTID,
			bankId: accountInfo?.BANKID || accountInfo?.ROUTINGNUM,
			startDate: undefined,
			endDate: undefined
		};
	} catch (error) {
		throw new Error(
			`Failed to parse OFX file: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Validate if a file buffer appears to be an OFX/QFX file
 */
export function isValidOfxFile(fileBuffer: Buffer): boolean {
	const content = fileBuffer.toString('utf-8', 0, Math.min(500, fileBuffer.length));

	// Check for OFX header markers
	return (
		content.includes('OFXHEADER') ||
		content.includes('<OFX>') ||
		content.includes('<?xml') ||
		content.includes('DATA:OFXSGML')
	);
}
