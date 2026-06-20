# **1\. Overview**

FreshersCo aims to replace its manual system for connecting and coordinating cleaning staff with hosts by implementing a digital solution. The goal is to improve operational efficiency and data accuracy while reducing administrative overhead. This plan outlines the development of a functional prototype designed to manage property listings, cleaning requests, staff assignments, and more.

The prototype will be developed as a Progressive Web App (PWA) due to its advantages in development and deployment compared to a native application, while providing a similar user experience with features like offline access and push notifications. PWAs utilise a single codebase that works across all platforms, speeding up development, and can be added directly to devices from the browser, allowing for instant updates without the need for app store approval.

Should FreshersCo require a fully native application in the future, the transition will be more efficient than starting from scratch. The PWA's UI components, data models, and business logic can be reused or it can be converted using a web-to-native wrapper like Capacitor or Tauri.

A Backend as a Service (BaaS) will be used for the prototype to handle authentication, database management, and storage. As a solo developer, this allows me to prioritise the frontend and core user workflows without the overhead of building a custom server infrastructure from the ground up. This approach significantly shortens the time to develop a functional MVP.

While the project will start with a BaaS, it will remain possible to migrate to a custom in-house backend if needed later. Since the data is stored in a standard relational format, the database can be migrated to an independent server. This ensures that the application is not permanently tied to a specific provider and can adapt as FreshersCo's requirements evolve.

---

# **2\. Technical Stack Analysis**

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
Supabase is chosen for its ability to accelerate prototype development. It is an open-source solution that provides essential tools without licensing costs. Using PostgreSQL ensures reliable data relationships, which is crucial for connecting Properties to Users and Cleanings. Its built-in authentication system simplifies user session management, while Supabase Storage efficiently handles media uploads for cleaning evidence. The open-source nature of Supabase fosters community support and provides abundant resources for troubleshooting.

**Alternatives**  
Firebase, while popular, utilises Firestore, a NoSQL database that complicates relational data management, increasing the risk of duplication. PlanetScale offers SQL-based solutions with strong data integrity but lacks the necessary integrations for authentication and storage found in Supabase.

## **2.5 Hosting**

**Proposed: Vercel**  
**Rationale**  
Vercel is selected for its ease of use and seamless integration with Vite, which ensures a straightforward deployment process. Its Edge Network delivers low-latency asset delivery, critical for a responsive user experience, while features like simplified routing and easy rollbacks help maintain application stability during updates.

**Alternatives**  
Netlify provides comparable features such as fast deployment and simple setups, but Vercel may optimise better for React applications. AWS offers a broad range of hosting options, but its complexity can slow deployment and increase maintenance efforts.

---

# 

# **3\. Assumptions**

## **3.1 Device Requirements and Permissions**

It is assumed that users are utilising modern mobile browsers compatible with necessary PWA features and that they will grant the required permissions for camera and notification access.

## **3.2 Payment Data & Integration**

To keep the prototype focused on the core workflow, all banking and payment steps are simulated. No real money will be processed by third-party services at this stage.  
---

# 

# **4\. Constraints**

## **4.1 Restricted Background Uploads**

PWAs lack the background execution privileges of native apps. While Android supports the required APIs for background process execution, iOS requires PWAs to stay open in the foreground to ensure the data transfer completes successfully. On iOS, the system suspends activity shortly after the PWA is minimised or the screen is locked, which will cancel active uploads. 

## **4.2 Volatile Browser Storage**

PWAs utilise browser-managed storage, which lacks the guaranteed persistence of native applications. On iOS, the operating system can automatically delete locally stored data without warning if the device runs low on disk space. While Android supports the Persistent Storage API to protect data from these automatic deletions, iOS does not offer a similar guarantee. As a result, media stored on the device remains at risk of being removed by the OS before the upload process is finished.

---

# 

# **5\. Risk Assessment and Mitigation**

## **5.1 Unauthorised Data Access**

Multi-role environments present risks of unauthorised data access or cross-account visibility. **Mitigation:** Implement strict Row-Level Security (RLS) policies at the database level and rigorous routing logic to ensure users only access data and dashboards assigned to their specific role.

## **5.2 Media Upload Failures**

Media uploads are vulnerable to failure on unstable mobile networks and on iOS devices as described in **5.1**.  
**Mitigation:** Implement TUS protocol for resumable file transfers. By caching the file locally in IndexedDB, the PWA ensures that even if the browser process is killed, the upload will resume from the point of failure upon the next launch.

## **5.3 Notification Reliability**

PWA push notifications exhibit lower reliability compared to native apps as Service Workers can be suspended by the OS in some circumstances.  
**Mitigation:** The system will automatically send a fallback email if a web notification cannot be delivered or if the user has not opted into mobile alerts, ensuring delivery of critical updates.  
---

# **6\. Functional Requirements**

## **6.1 Authentication and Authorisation**

### **6.1.1 User Registration**

Allow users to create accounts by selecting a role (Host, Cleaner, or Admin) and providing necessary credentials.

**Required Fields**  
**Email Address**

* **Format:** Must be a valid email format.  
* **Validation:** Must be unique.

**Password**

* **Length:** Minimum of 8 characters.  
* **Requirements:** Must include at least one uppercase letter, one lowercase letter, one digit, and one special character.

**First Name**

* **Format:** Unicode alphabetic characters; must support hyphens, apostrophes, and spaces.  
* **Length:** 1-50 characters.

**Last Name**

* **Format:** Unicode alphabetic characters; must support hyphens, apostrophes, and spaces.  
* **Length:** 1-50 characters.

**Role Selection**

* **Options:** Host, Cleaner, Admin.

**Validation Rules**

* Show an error message if the email format is invalid.  
* Indicate if the email is already registered.  
* Display appropriate error messages for weak passwords.

**Acceptance Criteria**

* The system validates the email format and notifies the user of invalid entries.  
* The system prevents registration with an already existing email and displays an appropriate error message.  
* The password meets complexity requirements; otherwise, an error message is shown.  
* Upon successful registration, a confirmation email is sent to the user.  
* A registration confirmation message is displayed on the user interface.

### **6.1.2 Secure Login**

Authenticate users via email and password with session persistence.

**Details**  
**Login Fields**  
Email and Password are required.  
**Security Measures**

* Passwords must be hashed and stored securely.  
* Implement a "remember me" option for persistent login.

**Validation Rules**

* Lock the account after 5 unsuccessful login attempts, notifying the user of the lockout.  
* Provide a "forgot password" link that triggers a password reset workflow.

**Acceptance Criteria**

* The system successfully logs in an authenticated user and establishes a session.  
* The system denies access after 5 unsuccessful attempts and displays an error message.  
* A password reset link is sent to the registered email address when requested.

### **6.1.3 Role-Based Access Control**

Restrict access to specific views and API endpoints based on the user's role.

**Details**  
**Roles:** Hosts, Cleaners, and Admins have distinct access levels.  
**Access Levels**

* **Host:** Can access features related to property management and cleaning requests.  
* **Cleaner:** Can access features related to assigned cleanings and task completion.  
* **Admin:** Can access platform-wide management, user administration, and analytics.

**Acceptance Criteria**

* Hosts are granted access to property and cleaning management features, while Cleaners and Admins cannot access them.  
* Cleaners can view their assigned cleanings, while Hosts and Admins have different appropriate access.  
* Admins have access to user management, platform analytics, and cleaning oversight.  
* Unauthorised attempts to access restricted features result in a "403 Forbidden" error.

## **6.2 Host Features**

### **6.2.1 Cleaning Request Creation**

A form to request cleaning services. When creating a cleaning request, Hosts can select a property from their saved list via a dropdown. The form must also allow the Host to enter a new property manually; if selected, this new property is automatically saved to their profile for future use.

**Required Fields**  
**Property Photos**

* Capability to upload multiple images (JPEG/PNG).  
* Max file size: 5 MB per image.

**Property Details**

* **Address:** Complete address (street, city, zip code).  
* **Type:** Selectable options (House, Apartment, Studio).  
* **Size:** Number of bedrooms and bathrooms.

**Schedule**

* **Date:** Select from a date picker.  
* **Start Time:** Selectable time.

**Tasks**

* Customisable checklist for cleaning tasks.  
* Space for post-clean instructions.

**Validation Rules**

* Validate the format of the address.  
* Ensure property size is numeric and within logical limits.

**Acceptance Criteria**

* Users can upload multiple property photos with successful confirmations.  
* When a Host enters a new property manually, the system successfully creates a new record in the `Properties` table and associates it with the Host's `user_id`.  
* The newly created property becomes immediately available in the dropdown for subsequent cleaning requests.  
*   
* The form requires all fields to be filled before submission, displaying appropriate error messages for any missing inputs.  
* The system saves and displays the cleaning request on confirmation.  
* Users can create a custom checklist and include post-clean instructions successfully.

### **6.2.2 Cleaning Management**

Management functionality for viewing requested, confirmed, in-progress, and completed cleanings.

**Details**

* Display lists of cleanings based on their status (requested, confirmed, in-progress, completed, cancelled).  
* Include filters for status and date range.

**Acceptance Criteria**

* Users can view all cleanings with detailed information.  
* Users can manage cleaning details effectively, including editing and cancelling cleanings before completion.  
* Admins can assign cleaners to pending cleaning requests.

### **6.2.3 Completion Review**

Allow hosts to view cleaning completion details.

**Details**

* Hosts can view photos and videos uploaded by the cleaner upon cleaning completion.  
* Hosts can view any reports submitted by the cleaner (e.g., broken items, low supplies).

**Acceptance Criteria**

* Users can access and view all uploaded media from the cleaner.  
* Users can view any reported issues from the cleaning.

### **6.2.4 Profile Management**

Functionality for hosts to edit their contact information and property details.

**Required Fields**  
**Contact Information**  
Email address, phone number.  
**Properties Details**  
A section to manage saved property details. Each property record includes the address, type, and size.

**Validation Rules**

* Validate email and phone formats.

**Acceptance Criteria**

* Users can update their contact information with verification.  
* Changes to property details can be saved successfully and reflected immediately.  
* All modifications are logged with timestamps for accountability.

## **6.3 Cleaner Features**

### **6.3.1 Assigned Cleaning Workflow**

Manage tasks and notifications for assigned cleanings.

**Details**

* **Reminder Notifications:** Automated alerts sent via email and mobile notifications on the cleaning day.  
* **Clock-In:** A button to record the start time of the cleaning job upon arrival at the location.  
* **Active Checklist:** An interactive checklist must be marked as complete for each task defined by the host.  
* **Media Upload:** Functionality to upload photos and videos as proof of work.  
* **Clock-Out:** Button to finalise the cleaning, triggering a status change to "Completed" and notifying the host.
* **Reporting:** Ability to report issues such as broken items or low supplies.

**Acceptance Criteria**

* Reminder notifications are sent to cleaners at 8 AM on the day of the cleaning.  
* Cleaners can clock in only when geolocation validation is successful, the server records the authenticated timestamp and GPS coordinates.  
* The active checklist displays all tasks, and each must be marked for completion.  
* Cleaners can upload media as proof of work.  
* Clocking out updates the cleaning status to "Completed" and notifies the host of completion.  
* Cleaners can submit reports for any issues found during the cleaning.

### **6.3.2 Profile Management**

Functionality for cleaners to edit their contact information and profile picture.

**Required Fields**  
**Contact Information**  
Editable fields for email address and phone number.  
**Profile Picture**  
Option to upload or change a profile picture (JPEG/PNG).

**Validation Rules**

* Validate email and phone formats upon editing.  
* Ensure image uploads comply with size limits (5 MB).

**Acceptance Criteria**

* Cleaners can update their contact information, with format validations in place.  
* Profile picture uploads succeed with confirmation upon completion.  
* All updates are reflected immediately in the cleaner's profile.

## **6.4 Admin Features**

### **6.4.1 User Management**

A dashboard interface for admins to manage Host and Cleaner profiles.

**Details**

* **Profile Viewing:** Admins can view full profiles of Hosts and Cleaners, including personal details and cleaning history.  
* **Edit Profile Functionality:** Admins can modify user profiles, including contact information, roles, and statuses.  
* **Ban Feature:** Admins can temporarily ban user accounts, with a reason for the ban recorded.

**Acceptance Criteria**

* Admins can view detailed profiles for both Hosts and Cleaners.  
* Admins can successfully edit user profiles and save those changes.  
* The system allows admins to ban a user account, with a prompt for a reason that is saved and visible in the user profile history.  
* Users are notified via email upon banning or reinstatement.

### **6.4.2 Cleaning Oversight**

Enable admins to monitor real-time status updates of all active cleanings.

**Details**

* Provide a dashboard view of all current cleanings, showing their status (e.g., requested, confirmed, in-progress, completed, cancelled).  
* **Filter Options:** Allow filtering by status, user, or date range.
* **Assignment:** Admin can assign cleaners to pending cleaning requests.

**Acceptance Criteria**

* Admins can view a live feed of all active cleanings with their respective statuses.  
* Filter options work correctly and update the dashboard content accordingly.  
* Admins can successfully assign cleaners to cleaning requests.

### **6.4.3 Analytics**

Provide insights into platform performance metrics.

**Details**  
Display key performance indicators, including:

* Total cleanings completed.  
* Count of active Hosts and Cleaners.  
* Revenue and payment statistics.

**Acceptance Criteria**

* Admins can access a dashboard with visual representations of the platform metrics.  
* Metrics update in real-time, reflecting current data.

### **6.4.4 Platform Configuration**

Admin functionality to manage platform-wide settings.

**Details**

* **Standard Tasks:** Define and manage the default cleaning task templates available for all cleanings.  
* **Cleaner Pay Rates:** Configure payment rates for cleaners.  
* **Base Pricing:** Configure base pricing for host cleaning requests.

**Acceptance Criteria**

* Admins can create, edit, and delete standard cleaning tasks.  
* Admins can configure cleaner pay rates.  
* Admins can set base pricing for cleaning services.

### **6.4.5 Audit Logging**

Track and display admin actions for accountability.

**Details**

* Log all admin actions with timestamps.  
* Display action history in a searchable format.

**Acceptance Criteria**

* All admin actions are recorded with timestamps.  
* Admins can view the audit log of past actions.

## **6.5 Notification System**

Manage notifications sent to users based on specific actions and events.

**Details**

* **Notification Delivery:** Implement the Web Push API to deliver real-time notifications to the service worker, supporting system-level alerts on Android and iOS.  
* **Subscription Management:** The system must prompt users to grant notification permissions and store the PushSubscription object.

**Acceptance Criteria**

* Hosts receive notifications through email and in-app alerts upon cleaning status changes.  
* Hosts are notified immediately once a cleaning is marked as completed.  
* Cleaners receive notifications via email and in-app alerts upon being assigned to a new cleaning.  
* Cleaners are sent reminders on the day of the scheduled cleaning, ensuring they are prepared.

---

## 

# **7\. Non-Functional Requirements**

## **7.1 Performance and Reliability**

Set performance benchmarks to ensure efficient user experience and system reliability.

**Details**  
**Latency Targets**  
Maximum load time for the dashboard of 3 seconds under standard 4G network conditions.  
**Offline Availability**  
Utilise service workers to cache critical resources, ensuring that property addresses and checklists remain accessible without active network connectivity.  
**Data Synchronisation**  
Implement an automated system for reconciling locally stored task updates once the client device regains internet access, ensuring all changes are captured.

**Acceptance Criteria**

* The dashboard loads within 3 seconds on a standard 4G connection in 95% of page loads.  
* Users can access property addresses and checklists offline, with a clear indication of offline status.  
* Once reconnected to the internet, any locally updated tasks synchronise automatically with the server, and users receive confirmations for successful updates.

## **7.2 Security and Privacy**

Establish robust security measures to protect user data and ensure privacy.

**Details**  
**Data Isolation**  
Enforce role-based access controls to ensure users only interact with records relevant to their specific role and assigned tasks.  
**Credential Encryption**  
Implement industry-standard encryption of all user credentials both during transmission and when stored at rest.  
**Storage Security**  
Store media assets in secure cloud storage buckets, accessible only through pre-signed URLs that limit exposure and access.

**Acceptance Criteria**

* Role-based access controls must be verified during testing to ensure users only see data pertinent to their role.  
* User credentials are encrypted using industry-standard methods, with routine audits confirming compliance.  
* Media assets must require signed URLs for access, preventing unauthorised users from accessing the files.

## **7.3 Usability and Compatibility**

Ensure the system is user-friendly and functions across a variety of devices and browsers.

**Details**  
**Mobile-First Responsiveness**  
Optimise the UI for handheld devices, ensuring that touch targets meet minimum accessibility standards (e.g., at least 48 pixels for touch targets).  
**Cross-Browser Support**  
Maintain feature parity across the latest versions of major browsers: Safari, Chrome, and Firefox.

**Acceptance Criteria**

* The UI passes accessibility testing, confirming that all touch targets meet minimum size standards.  
* Functional tests show that all features work identically across Safari, Chrome, and Firefox, with no significant discrepancies in user experience.

---

# **8\. Appendices**

## **8.1 Glossary**

**BaaS (Backend as a Service):** A platform that provides ready-to-use backend infrastructure like databases and authentication.

**Edge Network:** A distributed server architecture that delivers assets from the closest geographical location to the user to reduce latency.

**IndexedDB:** A browser-based storage system used for holding large amounts of data locally, enabling offline functionality.

**Pre-signed URLs:** Temporary, secure links that grant restricted access to private cloud storage files for a specific duration.

**PWA (Progressive Web App):** A web application that uses modern browser features to provide an app-like experience, including offline access and installation.

**RBAC (Role-Based Access Control):** A security model that restricts system access based on assigned user roles.

**RLS (Row-Level Security):** Database-level security policies that restrict data access to specific rows based on the user's identity.

**Service Workers:** Scripts that run in the browser background to handle caching, offline synchronization, and push notifications.

**SPA (Single-Page Application):** A web application architecture that updates the current page dynamically instead of loading entire new pages from the server.

## **8.2 References**

[https://survey.stackoverflow.co/2025/technology/](https://survey.stackoverflow.co/2025/technology/)

[https://www.geeksforgeeks.org/blogs/top-frontend-development-trends](https://www.geeksforgeeks.org/blogs/top-frontend-development-trends/#2-progressive-web-apps)

[https://www.softr.io/blog/pwa-vs-native-app](https://www.softr.io/blog/pwa-vs-native-app)

[https://medium.com/@anushkashrestha24/understanding-vites-development-and-build-process-8e740b93033d](https://medium.com/@anushkashrestha24/understanding-vites-development-and-build-process-8e740b93033d)

[https://caniuse.com/?search=background+fetch](https://caniuse.com/?search=background+fetch)