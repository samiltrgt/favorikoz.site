import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text, Link } from '@react-email/components'
export type NotificationProps = {
  title: string
  greeting?: string
  paragraphs: string[]
  details?: Array<{ label: string; value: string }>
  link?: { label: string; url: string }
}
export function NotificationEmail({ title, greeting, paragraphs, details = [], link }: NotificationProps) {
  return (
    <Html lang="tr">
      <Head />
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'Arial, Helvetica, sans-serif', padding: '24px', color: '#111111' }}>
        <Preview>{title}</Preview>
        <Container style={{ maxWidth: '560px', backgroundColor: '#ffffff', padding: '24px', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
          <Heading style={{ fontSize: '22px' }}>{title}</Heading>
          {greeting && <Text>{greeting}</Text>}
          {paragraphs.map((paragraph, index) => <Text key={index}>{paragraph}</Text>)}
          {details.map(({ label, value }) => <Text key={label}><strong>{label}:</strong> {value}</Text>)}
          {link && <Text><Link href={link.url} style={{ color: '#111111' }}>{link.label}</Link></Text>}
          <Text style={{ fontSize: '13px', color: '#777777' }}>Favori Kozmetik</Text>
        </Container>
      </Body>
    </Html>
  )
}
