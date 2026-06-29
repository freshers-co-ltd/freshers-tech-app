# **1. Overview**

FreshersCo aims to replace its manual system for connecting and coordinating cleaning staff with hosts by implementing a digital solution. The goal is to improve operational efficiency and data accuracy while reducing administrative overhead. This plan outlines the development of a minimum viable product (MVP) designed to manage property listings, cleaning requests, staff assignments, and more.

The MVP will be developed as a Progressive Web App (PWA) due to its advantages in development and deployment compared to a native application, while providing a similar user experience with features like offline access and push notifications. PWAs utilise a single codebase that works across all platforms, speeding up development, and can be added directly to devices from the browser, allowing for instant updates without the need for app store approval.

Should FreshersCo require a fully native application in the future, the transition will be more efficient than starting from scratch. The PWA's UI components, data models, and business logic can be reused or it can be converted using a web-to-native wrapper like Capacitor or Tauri.

A Backend as a Service (BaaS) will be used for the MVP to handle authentication, database management, and storage. As a solo developer, this allows me to prioritise the frontend and core user workflows without the overhead of building a custom server infrastructure from the ground up. This approach significantly shortens the time to develop a functional MVP.

While the project will start with a BaaS, it will remain possible to migrate to a custom in-house backend if needed later. Since the data is stored in a standard relational format, the database can be migrated to an independent server. This ensures that the application is not permanently tied to a specific provider and can adapt as FreshersCo's requirements evolve.

---

# **2. Technical Stack Analysis**

## **2.1 Frontend Library/Framework**

**Proposed: React**  
**Rationale**  
React is a leading frontend library with widespread adoption, offering a large community and extensive documentation, which facilitates troubleshooting and knowledge sharing. Its component-based architecture promotes code reusability and maintainability. Choosing a library like React offers more control over application structure and a lower learning curve compared to complex frameworks.

**Alternatives**  
Next.js provides server-side rendering, improving loading times but adds unnecessary complexity for a client-heavy dashboard without a focus on SEO. Angular is suitable for large-scale applications but is more complex, while Svelte offers excellent performance but has limited community support.

## **2.2 Build Tool**

**Proposed: Vite**  
**Rationale**  
Vite is a widely used modern build tool, known for its rapid module reloads and optimised production builds. It serves the browser native ES modules, allowing for a faster development experience, and leverages Rollup, which optimises files for production.

**Alternatives**  
Webpack is powerful and customisable but can be overly complex, leading to slower build times. Parcel simplifies the setup but doesn't match Vite's speed, while Snowpack has been largely overshadowed by Vite's superior performance.

## **2.3 UI Component Library**

**Proposed: shadcn/ui**  
**Rationale**  
shadcn/ui is a popular choice for building modern, responsive UIs, contributing to faster development cycles. Its integration of Tailwind CSS allows for quick and flexible styling options, while its use of Radix UI ensures compliance with accessibility standards, making it a great choice for developing the UI of a mobile-first PWA.

**Alternatives**  
Radix UI focuses on accessibility but requires more manual styling, which would slow development. Bootstrap accelerates development with pre-designed components but may restrict customisation. Material-UI offers a comprehensive component suite based on Material Design but could increase application size, impacting performance.

## **2.4 Backend as a Service (BaaS)**

**Proposed: Supabase**  
**Rationale**  
Supabase is chosen for its ability to accelerate development. It is an open-source solution that provides essential tools without licensing costs. Using PostgreSQL ensures reliable data relationships, which is crucial for connecting Properties to Users and Cleanings. Its built-in authentication system simplifies user session management, while Supabase Storage efficiently handles media uploads for cleaning evidence. The open-source nature of Supabase fosters community support and provides abundant resources for troubleshooting.

**Alternatives**  
Firebase, while popular, utilises Firestore, a NoSQL database that complicates relational data management, increasing the risk of duplication. PlanetScale offers SQL-based solutions with strong data integrity but lacks the necessary integrations for authentication and storage found in Supabase.

## **2.5 Hosting**

**Proposed: Vercel**  
**Rationale**  
Vercel is selected for its ease of use and seamless integration with Vite, which ensures a straightforward deployment process. Its Edge Network delivers low-latency asset delivery, critical for a responsive user experience, while features like simplified routing and easy rollbacks help maintain application stability during updates.

**Alternatives**  
Netlify provides comparable features such as fast deployment and simple setups, but Vercel may optimise better for React applications. AWS offers a broad range of hosting options, but its complexity can slow deployment and increase maintenance efforts.

---

# **3. Assumptions**

## **3.1 Device Requirements and Permissions**

It is assumed that users are utilising modern mobile browsers compatible with necessary PWA features and that they will grant the required permissions for camera and notification access.

## **3.2 Payment Data & Integration**

To keep the MVP focused on the core workflow, all banking and payment steps are simulated. No real money will be processed by third-party services at this stage.

---

# **4. Constraints**

## **4.1 Restricted Background Uploads**

PWAs lack the background execution privileges of native apps. While Android supports the required APIs for background process execution, iOS requires PWAs to stay open in the foreground to ensure the data transfer completes successfully. On iOS, the system suspends activity shortly after the PWA is minimised or the screen is locked, which will cancel active uploads. Uploads are handled with partial failure tolerance to mitigate the impact on unreliable connections.

## **4.2 Volatile Browser Storage**

PWAs utilise browser-managed storage, which lacks the guaranteed persistence of native applications. On iOS, the operating system can automatically delete locally stored data without warning if the device runs low on disk space. While Android supports the Persistent Storage API to protect data from these automatic deletions, iOS does not offer a similar guarantee. As a result, media stored on the device remains at risk of being removed by the OS before the upload process is finished.

# **5. Functional Requirements**

## **5.1 Authentication and Authorisation**

### **5.1.1 User Registration**

Allow users to create accounts by selecting a role (Host or Cleaner) and providing necessary credentials. Admin accounts are created via invitation only.

#### **Required Fields**

**Email Address**

* **Format:** Must be a valid email format.  
* **Validation:** Must be unique.

**Password**

* **Length:** Minimum of 8 characters.  
* **Requirements:** Must include at least one uppercase letter, one digit, and one special character.

**Full Name**

* **Format:** Unicode alphabetic characters; must support hyphens, apostrophes, and spaces.  
* **Length:** 2-50 characters.

**Role Selection**

Host, Cleaner (selected before the registration form).

#### **Validation Rules**

* Show an error message if the email format is invalid.  
* Indicate if the email is already registered.  
* Display appropriate error messages for weak passwords.

#### **Acceptance Criteria**

* The system validates the email format and notifies the user of invalid entries.  
* The system prevents registration with an already existing email and displays an appropriate error message.  
* The password meets complexity requirements; otherwise, an error message is shown.  
* Upon successful registration, an email verification code is sent to the user.  
* A registration confirmation message is displayed on the user interface after email verification.

### **5.1.2 Secure Login**

Authenticate users via email and password with session persistence.

#### **Details**

**Login Fields**  
Email and Password are required.

**Security Measures**

* Passwords must be hashed and stored securely.  
* A "remember me" option allows persistent sessions across browser restarts.  
* Lock the account after 5 unsuccessful login attempts. 
* Admin accounts require TOTP multi-factor authentication after successful password verification.  
* Sessions are synchronised across browser tabs for consistent authentication state.

#### **Acceptance Criteria**

* The system successfully logs in an authenticated user and establishes a session.  
* The system denies access after 5 unsuccessful attempts and displays an error message.
* A password reset link is sent to the registered email address when requested.  
* Admin users are prompted for MFA verification after entering their password.

### **5.1.3 Role-Based Access Control**

Restrict access to specific views based on the user's role.

#### **Details**

Hosts, Cleaners, and Admins have distinct access levels with separate navigation and dashboards.

**Access Levels**

* **Host:** Can access features related to property management, cleaning requests, and profile management.  
* **Cleaner:** Can access features related to assigned cleanings, clock-in/out, evidence upload, reporting, and profile management.  
* **Admin:** Can access platform-wide management, user administration, cleaning oversight, analytics, configuration, and profile management.

####  **Acceptance Criteria**

* Hosts are granted access to property and cleaning management features, while Cleaners and Admins cannot access them.  
* Cleaners can view their assigned cleanings, while Hosts and Admins have different appropriate access.  
* Admins have access to user management, platform analytics, and cleaning oversight.  
* Unauthorised attempts to access restricted features result in a "403 Forbidden" error page being displayed.

## **5.2 Host Features**

### **5.2.1 Cleaning Request Creation**

A form to request cleaning services. When creating a cleaning request, Hosts can select a property from their saved list or enter a new property manually; if a new property is created, it is automatically saved to their profile for future use.

#### **Required Fields**

**Property Selection**

Select an existing saved property or create a new one with address, type (House, Apartment, Studio), number of bedrooms and bathrooms, and photos.

**Cleaning Request Scheduling**

* **Date:** Select from a date picker.  
* **Start Time:** Select from a time picker.

**Tasks**

* Customisable checklist for cleaning tasks, with default tasks pre-populated.  
* Notes field for additional information.

#### **Validation Rules**

All required fields must be completed before submission.

#### **Acceptance Criteria**

* When a Host selects an existing property, the form pre-fills with the saved property details.  
* When a Host enters a new property, it is saved and immediately available for future requests.  
* The form requires all required fields to be filled before submission, displaying appropriate error messages for any missing inputs.  
* The system saves and displays the cleaning request on confirmation.  
* Users can create custom tasks successfully.

### **5.2.2 Cleaning Management**

Management functionality for viewing requested, confirmed, in-progress, and completed cleanings.

#### **Details**

* Display lists of cleanings based on their status (requested, confirmed, in-progress, completed, cancelled).  
* Include filters for status and date range.

#### **Acceptance Criteria**

* Users can view all cleanings with detailed information.  
* Users can manage cleaning details effectively, including editing and cancelling cleanings before completion.  
* Admins can assign cleaners to pending cleaning requests.

### **5.2.3 Completion Review**

Allow hosts to view cleaning completion details.

#### **Details**

* Hosts can view photos and videos uploaded by the cleaner as evidence of completed work.  
* Hosts can view any reports submitted by the cleaner (e.g., broken items, low supplies).  
* Media evidence is available for a limited period after completion.

#### **Acceptance Criteria**

* Users can access and view all uploaded media from the cleaner.  
* Users can view any reported issues from the cleaning.

## **5.3 Cleaner Features**

### **5.3.1 Assigned Cleaning Workflow**

Manage tasks and notifications for assigned cleanings.

**Details**

* **Reminder Notifications**
Automated alerts sent on the cleaning day.  
* **Clock-In**
A button to record the start time of the cleaning job upon arrival.
* **Active Checklist**
An interactive checklist that must be marked as complete for each task defined by the host.  
* **Media Upload**
Functionality to upload photos and videos as proof of work.  
* **Clock-Out**
Button to finalise the cleaning, which sets the status to "Completed" and notifies the host.
* **Reporting:** Ability to report issues such as broken items or low supplies.

#### **Acceptance Criteria**

* Reminder notifications are sent to cleaners on the day of the cleaning.
* The active checklist displays all tasks, and each must be marked for completion.  
* Cleaners can upload photos and videos as proof of work.  
* Clocking out updates the cleaning status to "Completed" and notifies the host of completion.  
* Cleaners can submit reports for any issues found during the cleaning.

## **5.4 Admin Features**

### **5.4.1 User Management**

A dashboard interface for admins to manage Host and Cleaner profiles.

#### **Details**

**Profile Viewing**

Admins can view full profiles of Hosts and Cleaners, including personal details, properties, and cleaning history.  

**Ban Feature**

Admins can temporarily ban user accounts.  

**User Actions**

Admins can reset user passwords and invite new users via email.

#### **Acceptance Criteria**

* Admins can view detailed profiles for both Hosts and Cleaners.  
* The system allows admins to ban and unban user accounts.  
* Admins can reset user passwords and invite new users.

### **5.4.2 Cleaning Oversight**

Enable admins to monitor and manage all cleanings on the platform.

#### **Details**

Provide a view of all cleanings with their status (requested, confirmed, in-progress, completed, cancelled).

* **Filter Options**
Allow filtering by status, user, or date range.
* **Assignment**
Admin can assign and reassign cleaners to cleaning requests.

#### **Acceptance Criteria**

* Admins can view all cleanings with their respective statuses.  
* Filter options work correctly and update the dashboard content accordingly.  
* Admins can assign and reassign cleaners to cleaning requests.

### **5.4.3 Analytics**

Provide insights into platform performance metrics.

#### **Details** 

Display key performance indicators with visual representations, including:

* Total cleanings completed, in progress, and cancelled.  
* Count of active Hosts and Cleaners.
* Trends over time for cleaning requests, revenue, and user growth.

#### **Acceptance Criteria**

* Admins can access a dashboard with visual representations of the platform metrics.  
* Admins can filter data by date ranges.  
* Metrics reflect current data.

### **5.4.4 Platform Configuration**

Admin functionality to manage platform-wide settings.

#### **Details**

**Standard Tasks**

Define and manage the default cleaning task templates available for all cleanings.  

**Cleaner Pay Rates**

Configure payment rates for cleaners, including hourly rates and time estimates per property type.  

**Property Pricing**

Set pricing for individual host properties, which is automatically applied when cleaning requests are created.

#### **Acceptance Criteria**

* Admins can create, edit, and delete standard cleaning tasks.  
* Admins can configure cleaner pay rates.  
* Admins can set pricing for host cleaning requests based on property.

### **5.4.5 Audit Logging**

Track and display admin actions for accountability.

#### **Details**

* Log all admin actions with timestamps, actor details, and before/after state changes.  
* Display action history in a searchable, filterable format.

#### **Acceptance Criteria**

* All admin actions are recorded with timestamps.  
* Admins can view and filter the audit log of past actions.

## **5.5 Profile Management**

Functionality for all users to manage their account details.

#### **Details**

**Personal Information**

Edit name, email address, and phone number.  

**Avatar**

Upload or change a profile picture (JPEG/PNG, max 5 MB).  

**Security**

Change password.  

**Preferences**

Enable or disable push notifications.

#### **Validation Rules**

* Validate email and phone formats upon editing.  
* Ensure image uploads comply with size limits.

#### **Acceptance Criteria**

* Users can update their personal information.  
* Users can upload and change their profile picture.  
* Users can change their password.  
* Users can configure their notification preferences.  
* All updates are reflected immediately.

## **5.6 Notification System**

Manage notifications sent to users based on specific actions and events.

#### **Details**

**In-App Notifications**

Notifications are stored in the database and delivered to users via their notification panel. Users receive notifications for cleaning lifecycle events (requested, confirmed, started, completed, cancelled, assigned, reassigned, updated).

**Push Notifications**

The Web Push API delivers system-level alerts to the device when enabled. Users are prompted to grant permission on first visit and can manage their subscription status in preferences. 

**Automated Reminders**

The system sends automatic notifications for same-day cleaning reminders, starting-soon alerts, and missed clock-in notifications.

#### **Acceptance Criteria**

* Hosts receive notifications upon cleaning status changes.
* Cleaners receive notifications upon being assigned to a new cleaning.  
* Cleaners receive reminder notifications on the day of the scheduled cleaning.  
* Users are prompted to grant push notification permissions on their first visit.
* Users can manage their notification preferences.  

---

# **6. Non-Functional Requirements**

## **6.1 Performance and Reliability**

Set performance benchmarks to ensure efficient user experience and system reliability.

#### **Details**

**Latency Targets** 

Maximum load time of 3 seconds for First Contentful Paint.  

**Offline Availability**  

Utilise service workers to cache critical resources, ensuring that property addresses and checklists remain accessible without active network connectivity.  

**Data Synchronisation**  

Implement an automated system for reconciling locally stored task updates once the client device regains internet access, ensuring all changes are captured.

#### **Acceptance Criteria**

* The First Contentful Paint loads within 3 seconds.  
* Users can access property addresses and checklists offline, with a clear indication of offline status.  
* Once reconnected to the internet, any locally updated tasks synchronise automatically with the server, and users receive confirmations for successful updates.

## **6.2 Security and Privacy**

Establish robust security measures to protect user data and ensure privacy.

#### **Details** 

**Data Isolation** 

Enforce role-based access controls and Row-Level Security (RLS) policies to ensure users only interact with records relevant to their specific role and assigned tasks. 

**Multi-Factor Authentication**  

Admin accounts require TOTP multi-factor authentication for an additional layer of security.

**Credential Encryption**  

Implement industry-standard encryption of all user credentials both during transmission and when stored at rest.  

**Data Protection**  

Use soft-delete patterns to prevent accidental data loss, with immutable audit trails that preserve the history of all record changes.  

**Storage Security**  

Store media assets in secure cloud storage buckets, accessible only through pre-signed URLs that limit exposure and access.

#### **Acceptance Criteria**

* Role-based access controls must be verified during testing to ensure users only see data pertinent to their role.  
* Admin accounts require MFA verification during login.  
* User credentials are encrypted using industry-standard methods, with routine audits confirming compliance.  
* Deleted records are preserved as soft-deletes with full audit history.  
* Media assets must require signed URLs for access, preventing unauthorised users from accessing the files.

## **6.3 Usability and Compatibility**

Ensure the system is user-friendly and functions across a variety of devices and browsers.

#### **Details**  

**Mobile-First Responsiveness**

Optimise the UI for handheld devices, ensuring that touch targets meet minimum accessibility standards.  

**Cross-Browser Support** 

Maintain feature parity across the latest versions of major browsers: Safari, Chrome, and Firefox.

#### **Acceptance Criteria**

* The UI passes standard accessibility testing.  
* Functional tests show that all features work identically across Safari, Chrome, and Firefox, with no significant discrepancies in user experience.

