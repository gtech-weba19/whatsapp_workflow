# Visual WhatsApp Chatbot Workflow Builder

This ZIP contains a working MVP codebase for a visual WhatsApp chatbot workflow builder using Laravel + MySQL + ReactJS + React Flow.

## Architecture
ReactJS (visual builder) -> Laravel REST API -> MySQL
WhatsApp webhook -> Laravel WorkflowEngine -> WhatsAppService

## Included
- Laravel backend API
- MySQL migrations
- Seed admin account and demo workflow
- React Flow visual workflow builder
- Start/Message/Button/Input/Condition/API/Image/Delay/End node palette
- Save and publish workflow
- WhatsApp webhook endpoint
- Bot sessions/messages/execution logs
- Mock WhatsApp mode when provider credentials are not configured
- Queue database migration

## Quick start
### Backend
cd backend
composer install
copy .env.example .env
php artisan key:generate
Create MySQL database `whatsapp_workflow`
php artisan migrate --seed
php artisan serve

### Frontend
cd frontend
npm install
npm run dev

Open http://localhost:5173
Demo login: admin@example.com / password

## Production notes
1. Configure real WhatsApp provider credentials in backend `.env`.
2. Put Laravel behind HTTPS.
3. Run `php artisan queue:work` under Supervisor.
4. Replace demo password immediately.
5. Add CSRF/CORS/domain hardening and provider webhook verification before production.
6. For complex branching, the next-node selector should be extended to use edge handles/conditions; the included engine is intentionally an MVP baseline.
