import type { Repository, TeamMember, ArchitectureNode, ArchitectureEdge, StorybookTopic, Flow, ChatMessage, AnalysisStep } from '@/types';

export const mockRepositories: Repository[] = [
  {
    id: '1',
    name: 'api-gateway',
    fullName: 'acme-corp/api-gateway',
    description: 'Main API gateway service handling authentication and routing',
    language: 'TypeScript',
    stars: 128,
    forks: 24,
    updatedAt: '2024-03-08T14:30:00Z',
    isConnected: false,
    isAnalyzing: false,
    analysisProgress: 0,
  },
  {
    id: '2',
    name: 'payment-service',
    fullName: 'acme-corp/payment-service',
    description: 'Payment processing and billing management',
    language: 'Go',
    stars: 89,
    forks: 15,
    updatedAt: '2024-03-07T09:15:00Z',
    isConnected: false,
    isAnalyzing: false,
    analysisProgress: 0,
  },
  {
    id: '3',
    name: 'user-management',
    fullName: 'acme-corp/user-management',
    description: 'User authentication, profiles, and permissions',
    language: 'Python',
    stars: 256,
    forks: 42,
    updatedAt: '2024-03-08T16:45:00Z',
    isConnected: false,
    isAnalyzing: false,
    analysisProgress: 0,
  },
  {
    id: '4',
    name: 'notification-engine',
    fullName: 'acme-corp/notification-engine',
    description: 'Email, SMS, and push notification service',
    language: 'TypeScript',
    stars: 67,
    forks: 12,
    updatedAt: '2024-03-06T11:20:00Z',
    isConnected: false,
    isAnalyzing: false,
    analysisProgress: 0,
  },
  {
    id: '5',
    name: 'analytics-platform',
    fullName: 'acme-corp/analytics-platform',
    description: 'Data analytics and reporting dashboard',
    language: 'Rust',
    stars: 312,
    forks: 58,
    updatedAt: '2024-03-08T18:00:00Z',
    isConnected: false,
    isAnalyzing: false,
    analysisProgress: 0,
  },
];

export const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah@acme-corp.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    role: 'owner',
    joinedAt: '2023-01-15T00:00:00Z',
    repositories: ['1', '2', '3', '4', '5'],
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    email: 'marcus@acme-corp.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
    role: 'admin',
    joinedAt: '2023-03-20T00:00:00Z',
    repositories: ['1', '2', '3'],
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily@acme-corp.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    role: 'member',
    joinedAt: '2023-06-10T00:00:00Z',
    repositories: ['2', '4'],
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david@acme-corp.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    role: 'member',
    joinedAt: '2023-08-05T00:00:00Z',
    repositories: ['3', '5'],
  },
];

export const mockArchitectureNodes: ArchitectureNode[] = [
  {
    id: '1',
    name: 'API Gateway',
    type: 'service',
    description: 'Main entry point for all API requests',
    files: ['src/gateway/index.ts', 'src/gateway/routes.ts'],
    dependencies: ['2', '3', '4'],
    position: { x: 400, y: 100 },
  },
  {
    id: '2',
    name: 'Auth Service',
    type: 'service',
    description: 'Handles authentication and authorization',
    files: ['src/auth/index.ts', 'src/auth/jwt.ts'],
    dependencies: ['3'],
    position: { x: 200, y: 250 },
  },
  {
    id: '3',
    name: 'User DB',
    type: 'module',
    description: 'User data storage and retrieval',
    files: ['src/db/user.ts', 'src/db/schema.ts'],
    dependencies: [],
    position: { x: 200, y: 400 },
  },
  {
    id: '4',
    name: 'Payment Service',
    type: 'service',
    description: 'Processes payments and manages billing',
    files: ['src/payment/index.ts', 'src/payment/stripe.ts'],
    dependencies: ['5', '6'],
    position: { x: 600, y: 250 },
  },
  {
    id: '5',
    name: 'Stripe API',
    type: 'external',
    description: 'External payment processor',
    files: [],
    dependencies: [],
    position: { x: 750, y: 150 },
  },
  {
    id: '6',
    name: 'Payment DB',
    type: 'module',
    description: 'Payment transaction storage',
    files: ['src/db/payment.ts'],
    dependencies: [],
    position: { x: 600, y: 400 },
  },
  {
    id: '7',
    name: 'Notification Service',
    type: 'service',
    description: 'Sends emails and push notifications',
    files: ['src/notification/index.ts'],
    dependencies: ['8'],
    position: { x: 400, y: 500 },
  },
  {
    id: '8',
    name: 'Email Provider',
    type: 'external',
    description: 'External email service',
    files: [],
    dependencies: [],
    position: { x: 550, y: 600 },
  },
];

export const mockArchitectureEdges: ArchitectureEdge[] = [
  { id: 'e1', source: '1', target: '2', type: 'calls' },
  { id: 'e2', source: '1', target: '4', type: 'calls' },
  { id: 'e3', source: '1', target: '7', type: 'calls' },
  { id: 'e4', source: '2', target: '3', type: 'uses' },
  { id: 'e5', source: '4', target: '5', type: 'calls' },
  { id: 'e6', source: '4', target: '6', type: 'uses' },
  { id: 'e7', source: '7', target: '8', type: 'calls' },
];

export const mockStorybookTopics: StorybookTopic[] = [
  {
    id: '1',
    title: 'System Overview',
    description: 'High-level architecture and data flow',
    content: `The system is built on a microservices architecture with the following key components:

**API Gateway**: Handles all incoming requests, performs authentication, and routes to appropriate services.

**Authentication Flow**: JWT-based authentication with refresh token rotation.

**Data Layer**: PostgreSQL for transactional data, Redis for caching and sessions.

**Communication**: Services communicate via gRPC internally and REST externally.`,
    files: ['docs/architecture.md', 'src/gateway/README.md'],
    relatedTopics: ['2', '4'],
  },
  {
    id: '2',
    title: 'Authentication',
    description: 'How user authentication works',
    content: `Authentication is handled by the Auth Service using JWT tokens.

**Login Flow**:
1. User submits credentials to /auth/login
2. Credentials are validated against User DB
3. Access token (15min) and refresh token (7days) are issued
4. Tokens are signed with RS256

**Password Security**:
- Passwords are hashed using bcrypt with cost factor 12
- Failed login attempts are rate-limited`,
    files: ['src/auth/index.ts', 'src/auth/jwt.ts'],
    relatedTopics: ['1', '3'],
  },
  {
    id: '3',
    title: 'User Management',
    description: 'User profiles, roles, and permissions',
    content: `The User Management service handles all user-related operations.

**Key Features**:
- Profile CRUD operations
- Role-based access control (RBAC)
- Permission inheritance
- User search and filtering

**Database Schema**:
- users table: core user data
- roles table: role definitions
- permissions table: granular permissions
- user_roles: many-to-many relationship`,
    files: ['src/user/index.ts', 'src/db/schema.ts'],
    relatedTopics: ['2'],
  },
  {
    id: '4',
    title: 'Payments',
    description: 'Payment processing and billing',
    content: `Payment processing is handled by the Payment Service with Stripe integration.

**Payment Flow**:
1. Client creates payment intent
2. Stripe processes the payment
3. Webhook confirms payment status
4. Invoice is generated and stored

**Security**:
- PCI compliance through Stripe
- Webhook signature verification
- Idempotency keys for all operations`,
    files: ['src/payment/index.ts', 'src/payment/stripe.ts'],
    relatedTopics: ['1', '5'],
  },
  {
    id: '5',
    title: 'Webhooks',
    description: 'Event handling and webhooks',
    content: `Webhooks are used for asynchronous event handling.

**Supported Events**:
- payment.succeeded
- payment.failed
- user.created
- subscription.updated

**Webhook Processing**:
1. Events are queued in Redis
2. Workers process events in order
3. Failed events are retried with exponential backoff
4. Dead letter queue for persistent failures`,
    files: ['src/webhook/index.ts', 'src/queue/worker.ts'],
    relatedTopics: ['4'],
  },
];

export const mockFlows: Flow[] = [
  {
    id: '1',
    name: 'User Signup',
    description: 'Complete user registration flow',
    steps: [
      { id: 's1', name: 'Validate Input', description: 'Validate email, password strength', type: 'function', file: 'src/auth/signup.ts', line: 15 },
      { id: 's2', name: 'Check Existing', description: 'Check if email already exists', type: 'database', file: 'src/db/user.ts', line: 42 },
      { id: 's3', name: 'Hash Password', description: 'Hash password with bcrypt', type: 'function', file: 'src/auth/password.ts', line: 8 },
      { id: 's4', name: 'Create User', description: 'Insert user record', type: 'database', file: 'src/db/user.ts', line: 67 },
      { id: 's5', name: 'Send Welcome', description: 'Queue welcome email', type: 'service', file: 'src/notification/email.ts', line: 23 },
      { id: 's6', name: 'Generate Tokens', description: 'Create JWT access and refresh tokens', type: 'function', file: 'src/auth/jwt.ts', line: 31 },
    ],
  },
  {
    id: '2',
    name: 'Payment Processing',
    description: 'Process a payment transaction',
    steps: [
      { id: 'p1', name: 'Create Intent', description: 'Create Stripe payment intent', type: 'external', file: 'src/payment/stripe.ts', line: 45 },
      { id: 'p2', name: 'Validate Amount', description: 'Check amount limits and currency', type: 'function', file: 'src/payment/validate.ts', line: 12 },
      { id: 'p3', name: 'Check Balance', description: 'Verify user has sufficient funds', type: 'database', file: 'src/db/account.ts', line: 89 },
      { id: 'p4', name: 'Process Payment', description: 'Charge the payment method', type: 'external', file: 'src/payment/stripe.ts', line: 78 },
      { id: 'p5', name: 'Record Transaction', description: 'Save transaction to database', type: 'database', file: 'src/db/payment.ts', line: 56 },
      { id: 'p6', name: 'Send Receipt', description: 'Email payment receipt', type: 'service', file: 'src/notification/email.ts', line: 67 },
    ],
  },
  {
    id: '3',
    name: 'Password Reset',
    description: 'Forgot password flow',
    steps: [
      { id: 'r1', name: 'Request Reset', description: 'Initiate password reset', type: 'function', file: 'src/auth/reset.ts', line: 18 },
      { id: 'r2', name: 'Find User', description: 'Lookup user by email', type: 'database', file: 'src/db/user.ts', line: 34 },
      { id: 'r3', name: 'Generate Token', description: 'Create secure reset token', type: 'function', file: 'src/auth/tokens.ts', line: 45 },
      { id: 'r4', name: 'Store Token', description: 'Save token with expiration', type: 'database', file: 'src/db/tokens.ts', line: 22 },
      { id: 'r5', name: 'Send Email', description: 'Email reset link to user', type: 'service', file: 'src/notification/email.ts', line: 91 },
    ],
  },
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'How does authentication work in this repository?',
    timestamp: new Date('2024-03-08T10:00:00Z'),
  },
  {
    id: '2',
    role: 'assistant',
    content: 'Authentication in this repository uses JWT tokens with the following flow:\n\n1. **Login** (`src/auth/index.ts:45`): Validates credentials and issues tokens\n2. **Token Generation** (`src/auth/jwt.ts:31`): Creates access (15min) and refresh (7day) tokens\n3. **Middleware** (`src/gateway/auth.ts:23`): Validates tokens on protected routes\n4. **Password Hashing** (`src/auth/password.ts:8`): Uses bcrypt with cost factor 12\n\nThe system supports role-based access control with permissions stored in the database.',
    timestamp: new Date('2024-03-08T10:00:05Z'),
    references: [
      { file: 'src/auth/index.ts', line: 45, description: 'Login handler' },
      { file: 'src/auth/jwt.ts', line: 31, description: 'Token generation' },
      { file: 'src/gateway/auth.ts', line: 23, description: 'Auth middleware' },
    ],
  },
  {
    id: '3',
    role: 'user',
    content: 'Where is the payment logic implemented?',
    timestamp: new Date('2024-03-08T10:05:00Z'),
  },
  {
    id: '4',
    role: 'assistant',
    content: 'Payment logic is primarily in the Payment Service:\n\n**Main Files**:\n- `src/payment/index.ts`: Core payment handlers\n- `src/payment/stripe.ts`: Stripe integration\n- `src/payment/validate.ts`: Payment validation\n\n**Key Functions**:\n- `createPaymentIntent()` - Initiates payment flow\n- `processWebhook()` - Handles Stripe webhooks\n- `validatePayment()` - Checks amount limits and currency\n\nThe service uses Stripe for payment processing and stores transaction records in PostgreSQL.',
    timestamp: new Date('2024-03-08T10:05:03Z'),
    references: [
      { file: 'src/payment/index.ts', line: 1, description: 'Payment service entry' },
      { file: 'src/payment/stripe.ts', line: 45, description: 'Stripe integration' },
      { file: 'src/db/payment.ts', line: 56, description: 'Transaction storage' },
    ],
  },
];

export const mockAnalysisSteps: AnalysisStep[] = [
  { id: '1', name: 'Reading repository structure', description: 'Scanning files and directories', status: 'completed', progress: 100 },
  { id: '2', name: 'Mapping dependencies', description: 'Analyzing import relationships', status: 'completed', progress: 100 },
  { id: '3', name: 'Detecting services', description: 'Identifying microservices and modules', status: 'in_progress', progress: 75 },
  { id: '4', name: 'Generating architecture model', description: 'Building system diagram', status: 'pending', progress: 0 },
  { id: '5', name: 'Creating documentation', description: 'Generating storybook and flows', status: 'pending', progress: 0 },
];

export const mockChatSuggestions = [
  'How does authentication work?',
  'Where is payment logic implemented?',
  'What happens on signup?',
  'Explain the database schema',
  'How are webhooks handled?',
  'What services depend on the user service?',
];
