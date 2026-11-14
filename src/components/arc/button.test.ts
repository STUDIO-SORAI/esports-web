import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Button } from './button/button';
import { Badge } from './badge/badge';
import { Alert } from './alert/alert';
import { ThemeSwitch } from './theme-switch/theme-switch';

describe('Arc UI Button, Badge, ThemeSwitch, and Alert', () => {
  it('renders standard Button as a button tag with proper classes', () => {
    const html = renderToString(
      React.createElement(Button, { variant: 'primary', size: 'md' }, '送出投稿')
    );
    expect(html).toContain('<button');
    expect(html).toContain('送出投稿');
    expect(html).toContain('type="button"');
  });

  it('renders Button with as="a" as an anchor link', () => {
    const html = renderToString(
      React.createElement(
        Button,
        { as: 'a', href: 'https://example.com', variant: 'primary' },
        '連結按鈕'
      )
    );
    expect(html).toContain('<a');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('連結按鈕');
  });

  it('renders Badge with children always visible (no initial opacity:0 blur)', () => {
    const html = renderToString(
      React.createElement(Badge, { tone: 'danger', pill: true }, '特戰英豪')
    );
    expect(html).toContain('特戰英豪');
    expect(html).not.toContain('opacity:0');
  });

  it('renders ThemeSwitch with id="theme-toggle-btn" for instant interaction', () => {
    const html = renderToString(
      React.createElement(ThemeSwitch, {
        theme: 'dark',
        iconOnly: true,
      })
    );
    expect(html).toContain('id="theme-toggle-btn"');
    expect(html).toContain('<button');
  });

  it('renders Alert with proper title and tone', () => {
    const html = renderToString(
      React.createElement(Alert, { tone: 'success', title: '成功' }, '已收到稿件')
    );
    expect(html).toContain('成功');
    expect(html).toContain('已收到稿件');
  });
});
