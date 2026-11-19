import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs/tabs';

describe('Arc UI Tabs', () => {
  it('renders correctly on server with active tab selection', () => {
    const html = renderToString(
      React.createElement(
        Tabs,
        { defaultValue: 'tab1' },
        React.createElement(
          TabsList,
          null,
          React.createElement(TabsTrigger, { value: 'tab1' }, 'Tab 1'),
          React.createElement(TabsTrigger, { value: 'tab2' }, 'Tab 2')
        ),
        React.createElement(TabsContent, { value: 'tab1' }, 'Content 1'),
        React.createElement(TabsContent, { value: 'tab2' }, 'Content 2')
      )
    );

    expect(html).toContain('Tab 1');
    expect(html).toContain('Tab 2');
    expect(html).toContain('Content 1');
  });
});
