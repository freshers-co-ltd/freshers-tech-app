/**
 * Dictionary strings for E2E assertions — mirrors subset of src/dictionary.ts.
 * Mock credentials and pre-determined UUIDs for all test entities.
 */
export const DICT = {
	NAV: {
		DASHBOARD: 'Dashboard',
		CLEANINGS: 'Cleanings',
		PROPERTIES: 'Properties',
		ACCOUNT: 'Account',
		USERS: 'Users',
		ANALYTICS: 'Analytics',
	},
	AUTH: {
		LOGIN: {
			TITLE: 'Log in to your account',
			BUTTON_SUBMIT: 'Log in',
			BUTTON_SUBMITTING: 'Logging in...',
			LINK_FORGOT: 'Forgot your password?',
			LABEL_NO_ACCOUNT: "Don't have an account?",
			LINK_SIGNUP: 'Sign up',
			TOAST_SUCCESS: 'Login successful',
			CHECKBOX_TRUST: 'Trust this device',
		},
		SIGNUP: {
			TITLE: 'Join Freshers Co',
			BUTTON_SUBMIT: 'Create Account',
			BUTTON_SUBMITTING: 'Creating Account...',
			LABEL_HAVE_ACCOUNT: 'Already have an account?',
			LINK_LOGIN: 'Log in',
			MESSAGE: "Select how you'll be using our platform",
			ROLES: {
				HOST: {
					TITLE_FORM: 'Register as a host',
					BUTTON_MESSAGE: 'I want my properties professionally cleaned.',
					BUTTON_TITLE: 'Host',
				},
				CLEANER: {
					TITLE_FORM: 'Register as a cleaner',
					BUTTON_MESSAGE: 'I want to find cleaning jobs that fit my schedule.',
					BUTTON_TITLE: 'Cleaner',
				},
				CALL_TO_ACTION: 'Get started',
			},
			TOAST_SUCCESS: 'Account created successfully',
			VERIFICATION: {
				TOAST_SUCCESS: 'Verification email sent',
				TITLE: 'Verify your email',
				MESSAGE: 'Enter the 6-digit code sent to',
				BUTTON_SUBMIT: 'Verify Account',
				BUTTON_RESEND: 'Resend code',
			},
		},
	},
	PROPERTIES: {
		TITLE: 'Properties',
		NEW: 'New property',
		MESSAGE_EMPTY: "You haven't saved any properties yet.",
		TYPES: {
			APARTMENT: 'Apartment',
			HOUSE: 'House',
			STUDIO: 'Studio',
		},
		CREATE: {
			TITLE: 'Save new property',
			TOAST: 'Property saved successfully',
		},
		EDIT: {
			TITLE: 'Edit property',
			TOAST: 'Property updated successfully',
		},
		DELETE: {
			TITLE: 'Delete property?',
			TOAST: 'Property deleted successfully',
		},
		FORM: {
			ADDRESS_LABEL: 'Address Line 1',
			TOWN_LABEL: 'Town/City',
			POSTCODE_LABEL: 'Postcode',
			BEDROOMS_LABEL: 'Bedrooms',
			BATHROOMS_LABEL: 'Bathrooms',
			TYPE_LABEL: 'Property Type',
			BUTTON_SUBMIT: 'Add Property',
			BUTTON_UPDATE: 'Update Property',
		},
	},
	CLEANINGS: {
		TITLE: 'Cleaning requests',
		NEW: 'New cleaning request',
		EMPTY: {
			MESSAGE_HOST: "You haven't booked any cleaning services yet.",
			MESSAGE_CLEANER: "You don't have any cleaning jobs assigned to you yet.",
		},
		CREATE: {
			TITLE: 'Create new cleaning request',
			BUTTON_SUBMIT: 'Request Cleaning',
			TOAST_SUCCESS: 'Cleaning request created successfully',
		},
		DELETE: {
			TITLE: 'Cancel cleaning request?',
			TOAST: 'Cleaning request cancelled successfully',
		},
		ASSIGN_CLEANER: {
			TITLE: 'Assign Cleaner',
			SELECT: 'Select a cleaner',
			TOAST_SUCCESS: 'Cleaner assigned',
		},
		DETAIL: {
			TITLE: 'Cleaning Details',
			CLOCK_IN: {
				SUCCESS: 'Successfully clocked in!',
				BUTTON: 'Clock In',
			},
			COMPLETION: {
				SUCCESS: 'Cleaning completed and report submitted!',
				BUTTON_FINISH: 'Finish & Submit Report',
				BUTTON_COMPLETE: 'Complete Cleaning',
				BUTTON_UPLOADING: 'Uploading Evidence...',
			},
			CHECKBOXES: {
				NO_BROKEN_ITEMS: 'No broken or damaged items to report',
				NO_LOW_SUPPLIES: 'No low supplies to report',
			},
			STATUS_ASSIGNED: 'ASSIGNED',
			STATUS_IN_PROGRESS: 'In Progress',
			STATUS_COMPLETED: 'Completed',
		},
		FORM: {
			STEPS: {
				PROPERTY: 'Select Property',
				DETAILS: 'Service Details',
				CHECKLIST: 'Checklist',
			},
			LABELS: {
				SCHEDULED_DATE: 'Scheduled Date',
				SCHEDULED_TIME: 'Scheduled Time',
			},
		},
		SEARCH: {
			PLACEHOLDER: 'Search by address...',
		},
	},
	DASHBOARD: {
		HOST: {
			STATS: {
				CONFIRMED: 'Upcoming cleanings',
				IN_PROGRESS: 'Cleanings in progress',
				REQUESTED: 'Waiting for confirmation',
				TOTAL_COSTS: 'Cleaning costs for',
			},
		},
		CLEANER: {
			STATS: {
				ASSIGNED: 'Assigned Cleanings',
				ACTIVE: 'Active Cleanings',
				COMPLETED: 'Completed Cleanings',
				TOTAL_EARNINGS: 'Earnings for',
			},
		},
		ADMIN: {
			STATS: {
				COMPLETED_THIS_MONTH: 'Completed Cleanings This Month',
				IN_PROGRESS: 'Cleanings In Progress',
				AVG_COMPLETION_TIME: 'Average Completion Time',
				TOTAL_PROPERTIES: 'Total Properties',
			},
		},
	},
	ADMIN: {
		USERS: {
			TITLE: 'User Management',
			TABS: {
				ALL: 'All Roles',
				HOSTS: 'Hosts',
				CLEANERS: 'Cleaners',
				ADMINS: 'Admins',
			},
			INVITE_USER: {
				TITLE: 'Invite New User',
				MESSAGE: 'Send an invitation link to a new user',
				BUTTON_SUBMIT: 'Send Invite',
			},
			DETAIL: {
				TITLE_HOST: 'Host Details',
				TITLE_CLEANER: 'Cleaner Details',
				INVITED_HOST: 'Free (Invited)',
				INACTIVE_HOST: 'No Active Subscription',
			},
		},
		CLEANINGS: {
			TITLE: 'Cleaning Operations',
			BUTTONS: {
				STANDARD_TASKS: 'Standard Tasks',
				PAY_RATES: 'Pay Rates',
			},
			TASKS: {
				TITLE: 'Standard Tasks',
				ADD: 'Add Task',
				SAVE: 'Save Changes',
			},
		},
	},
	ICAL: {
		TITLE: 'Calendar Sync',
		EMPTY: 'No calendar links connected yet.',
		ADD: 'Add calendar link',
		SYNC_NOW: 'Sync now',
		NEVER_SYNCED: 'Not synced yet',
		CREATE: { TITLE: 'Connect a calendar' },
	},
	TOASTS: {
		PAY_RATES_UPDATED: 'Pay rates updated successfully',
		STANDARD_TASKS_UPDATED: 'Standard tasks updated successfully',
		INVITATION_SENT: 'Invitation sent successfully',
	},
	SUBSCRIPTION: {
		PENDING: {
			TITLE: 'Complete Your Subscription',
			MESSAGE:
				'Subscribe for {price} to access the platform. Click below to get redirected to Stripe for payment.',
			BUTTON_SUBSCRIBE: 'Subscribe Now With Stripe',
		},
		SUCCESS: {
			TITLE: 'Subscription Activated',
			MESSAGE: 'Your subscription is now active. Welcome to Freshers!',
			BUTTON_DASHBOARD: 'Go to Dashboard',
		},
		CANCELED: {
			TITLE: 'Subscription Required',
			MESSAGE: 'You need an active subscription to access the platform.',
			BUTTON_RETRY: 'Try Again',
			BUTTON_SUPPORT: 'Contact Support',
		},
		PAYMENT_FAILED: {
			MESSAGE: 'Your subscription payment failed. Please update your payment method.',
			BUTTON_UPDATE: 'Update Payment Method',
		},
		STATUS_LABEL: 'Status',
		STATUS_ACTIVE: 'Active',
		STATUS_PAYMENT_ISSUE: 'Payment Issue',
		STATUS_INACTIVE: 'Inactive',
		STATUS_PENDING: 'Pending',
		UNSUBSCRIBED: 'Unsubscribed',
		MANAGE: 'Manage Subscription',
		RESUBSCRIBE: 'Resubscribe',
		RENEWAL_DATE: 'Renewal Date',
		SECTION_TITLE: 'Subscription',
		PROCESSING: 'Processing...',
	},
	ACCOUNT: {
		TITLE: 'Account Settings',
		BUTTON_SIGN_OUT: 'Sign out',
	},
	COMMON: {
		ACTIONS: {
			ASSIGN_CLEANER: 'Assign Cleaner',
			BACK: 'Back',
			CANCEL: 'Cancel',
			DELETE: 'Delete',
			EDIT: 'Edit',
			SAVE: 'Save',
			ASSIGN: 'Assign',
		},
		LABELS: {
			EMAIL: 'Email',
			NAME: 'Full Name',
			PASSWORD: 'Password',
			CONFIRM_PASSWORD: 'Confirm Password',
			ROLE: 'Role',
			STATUS: 'Status',
		},
	},
	ERRORS: {
		AUTH: {
			INVALID_CREDENTIALS: 'Invalid email or password.',
		},
	},
} as const;

export const MOCK_CREDENTIALS = {
	HOST: { email: 'host@example.com', password: 'TestPass123!' },
	CLEANER: { email: 'cleaner@example.com', password: 'TestPass123!' },
	ADMIN: { email: 'admin@example.com', password: 'TestPass123!' },
} as const;

export const MOCK_UUIDS = {
	HOST: '00000000-0000-0000-0000-000000000001',
	CLEANER: '00000000-0000-0000-0000-000000000002',
	CLEANER_2: '00000000-0000-0000-0000-000000000003',
	ADMIN: '00000000-0000-0000-0000-00000000000a',
	PROPERTY_1: '00000000-0000-0000-0000-000000000010',
	PROPERTY_2: '00000000-0000-0000-0000-000000000011',
	CLEANING_1: '00000000-0000-0000-0000-000000000020',
	CLEANING_2: '00000000-0000-0000-0000-000000000021',
	CLEANING_3: '00000000-0000-0000-0000-000000000022',
	TASK_1: '00000000-0000-0000-0000-000000000030',
	TASK_2: '00000000-0000-0000-0000-000000000031',
	TASK_3: '00000000-0000-0000-0000-000000000032',
	STANDARD_TASK_1: '00000000-0000-0000-0000-000000000040',
	STANDARD_TASK_2: '00000000-0000-0000-0000-000000000041',
	EVIDENCE_1: '00000000-0000-0000-0000-000000000050',
	REPORT_1: '00000000-0000-0000-0000-000000000060',
	NEW_PROPERTY: '00000000-0000-0000-0000-000000000100',
	SUBSCRIPTION_1: '00000000-0000-0000-0000-000000000070',
} as const;
