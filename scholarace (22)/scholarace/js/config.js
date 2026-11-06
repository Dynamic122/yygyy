// ScholarAce settings. Edit this file, then upload the site again. No server needed.
window.SA_CONFIG = {
  brand: 'ScholarAce',
  tagline: 'Practise JAMB the real CBT way',
  dailyLimit: 5,           // questions a Free student can answer per day (resets at midnight, Africa/Lagos)
  mockMaxMinutes: 120,     // the full mock never runs longer than this (real JAMB: 120 minutes)
  secondsPerQuestion: 40,  // Premium pace, same as real JAMB (180 questions in 120 minutes)
  jambDate: '2027-05-31',  // the "Until JAMB" plan ends on this date. CHANGE IT to your target UTME date.
  announcement: '',        // a message shown at the top of every page. Leave empty for none.
  support: {
    phone: '09162922107',
    whatsapp: '2349162922107', // same number in international format, no + sign
    email: 'erinfolamitola7@gmail.com'
  },
  payment: {
    bank: 'Opay',
    accountNumber: '9162922107',
    accountName: 'Erinfolami Tola' // must match the name shown on your Opay account
  },
  plans: [
    { id: 'monthly', name: '1 Month', price: 1500, days: 30, blurb: 'Try Premium for a month' },
    { id: 'quarter', name: '3 Months', price: 5000, days: 90, blurb: 'Three months of full practice' },
    { id: 'exam', name: 'Until JAMB', price: 20000, until: true, blurb: 'Covered all the way to exam day', best: true }
  ],
  // Paste the PUBLIC key from owner.html (Setup tab) here. It lets the site check your activation links.
  codeDeadline: '2027-05-31', // activation codes made now stop working after this date (and after JAMB)
  backendUrl: '',            // address of the optional code-sending server, e.g. 'https://scholarace-api.example.com'. Leave empty to use manual WhatsApp codes. If the site is opened from the server itself (node server/server.js) it is found automatically.
  cloudAccounts: true,       // with the server running, accounts, Premium and results are kept on the server (works on any phone)
  requireVerification: true, // new students must enter a code you send to their own WhatsApp number (needs ownerPublicKey)
  ownerPublicKey: null
};
