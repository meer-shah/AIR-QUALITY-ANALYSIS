/** 404 — calm, on-brand fallback. */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../components/layout/page-container';
import { Button } from '../components/ui/button';

const NotFound: React.FC = () => (
  <main>
    <PageContainer className="py-24 flex flex-col gap-5 max-w-reading">
      <span className="overline text-brand-600">404</span>
      <h1 className="text-h1 text-ink-900">That page isn't here</h1>
      <p className="text-body-md text-ink-600">
        The link may be out of date. Head back to the dashboard to start again.
      </p>
      <div>
        <Button as={Link} to="/">
          Back to dashboard
        </Button>
      </div>
    </PageContainer>
  </main>
);

export default NotFound;
