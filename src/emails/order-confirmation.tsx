import * as React from 'react'
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'

export type OrderConfirmationItem = {
  name?: string
  quantity?: number
  price?: number
}

export type OrderConfirmationEmailProps = {
  customerName: string
  orderNumber: string
  items: OrderConfirmationItem[]
  subtotalLabel: string
  shippingLabel: string
  totalLabel: string
  addressLine: string
  cityZip: string
}

export function OrderConfirmationEmail({
  customerName,
  orderNumber,
  items,
  subtotalLabel,
  shippingLabel,
  totalLabel,
  addressLine,
  cityZip,
}: OrderConfirmationEmailProps) {
  const preview = `Siparişiniz alındı — ${orderNumber}`

  return (
    <Html lang="tr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Siparişiniz alındı</Heading>
          <Text style={styles.muted}>
            Merhaba {customerName || 'müşterimiz'}, siparişiniz için teşekkür ederiz.
          </Text>
          <Text style={styles.text}>
            <strong>Sipariş no:</strong> {orderNumber}
          </Text>

          <Section style={styles.tableSection}>
            <Row style={styles.tableHeader}>
              <Column style={styles.colProduct}>
                <Text style={styles.th}>Ürün</Text>
              </Column>
              <Column style={styles.colQty}>
                <Text style={{ ...styles.th, textAlign: 'center' as const }}>Adet</Text>
              </Column>
              <Column style={styles.colAmount}>
                <Text style={{ ...styles.th, textAlign: 'right' as const }}>Tutar</Text>
              </Column>
            </Row>
            {items.map((item, index) => {
              const qty = item.quantity || 1
              const line = (item.price || 0) * qty
              return (
                <Row key={`${item.name || 'item'}-${index}`} style={styles.tableRow}>
                  <Column style={styles.colProduct}>
                    <Text style={styles.td}>{item.name || 'Ürün'}</Text>
                  </Column>
                  <Column style={styles.colQty}>
                    <Text style={{ ...styles.td, textAlign: 'center' as const }}>{qty}</Text>
                  </Column>
                  <Column style={styles.colAmount}>
                    <Text style={{ ...styles.td, textAlign: 'right' as const }}>
                      ₺{formatTry(line)}
                    </Text>
                  </Column>
                </Row>
              )
            })}
          </Section>

          <Text style={styles.text}>
            <strong>Ara toplam:</strong> ₺{subtotalLabel}
          </Text>
          <Text style={styles.text}>
            <strong>Kargo:</strong> {shippingLabel}
          </Text>
          <Text style={styles.total}>
            <strong>Toplam:</strong> ₺{totalLabel}
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.text}>
            <strong>Teslimat adresi</strong>
          </Text>
          <Text style={styles.muted}>
            {addressLine || '-'}
            <br />
            {cityZip}
          </Text>

          <Text style={styles.footer}>Favori Kozmetik</Text>
        </Container>
      </Body>
    </Html>
  )
}

function formatTry(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100)
}

const styles = {
  body: {
    backgroundColor: '#f9fafb',
    fontFamily:
      'Arial, Helvetica, sans-serif',
    color: '#111111',
    margin: '0',
    padding: '24px',
    lineHeight: '1.5',
  },
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '24px',
  },
  heading: {
    margin: '0 0 8px',
    fontSize: '22px',
    fontWeight: '700' as const,
    color: '#111111',
  },
  text: {
    margin: '8px 0',
    fontSize: '15px',
    color: '#111111',
  },
  muted: {
    margin: '0 0 20px',
    fontSize: '15px',
    color: '#555555',
  },
  total: {
    margin: '8px 0 20px',
    fontSize: '18px',
    color: '#111111',
  },
  tableSection: {
    marginBottom: '16px',
    width: '100%' as const,
  },
  tableHeader: {
    borderBottom: '2px solid #111111',
  },
  tableRow: {
    borderBottom: '1px solid #eeeeee',
  },
  colProduct: { width: '56%' },
  colQty: { width: '16%' },
  colAmount: { width: '28%' },
  th: {
    margin: '0',
    padding: '0 0 8px',
    fontSize: '13px',
    fontWeight: '700' as const,
    color: '#111111',
  },
  td: {
    margin: '0',
    padding: '8px 0',
    fontSize: '14px',
    color: '#111111',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '8px 0 16px',
  },
  footer: {
    margin: '0',
    fontSize: '13px',
    color: '#777777',
  },
}

export default OrderConfirmationEmail
