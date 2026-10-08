import { render, screen, fireEvent } from '@testing-library/react'
import ResponsiveImage from '@/components/responsive-image'
import manifest from '@/data/optimized-images.json'
import { responsiveImage } from '@/lib/responsive-image'
import { optimizedImageSource } from '@/lib/responsive-image-server'

test('mapped priority images expose their real srcset in the first render', () => {
  const source = optimizedImageSource(Object.keys(manifest)[0])
  const onLoad = jest.fn()
  render(<ResponsiveImage src={source} alt="Catalog image" fill priority sizes="170px" onLoad={onLoad} />)
  const image = screen.getByAltText('Catalog image')
  expect(image).toHaveAttribute('srcset', responsiveImage(source)!.srcSet)
  expect(image).toHaveAttribute('sizes', '170px')
  expect(image).toHaveAttribute('loading', 'eager')
  expect(image).toHaveAttribute('fetchpriority', 'high')
  expect(image).toHaveStyle({ position: 'absolute', width: '100%', height: '100%' })
  fireEvent.load(image)
  expect(onLoad).toHaveBeenCalledTimes(1)
})

test('mapped images below the first viewport remain lazy with no high priority', () => {
  const source = optimizedImageSource(Object.keys(manifest)[0])
  render(<ResponsiveImage src={source} alt="Later image" width={170} height={170} />)
  const image = screen.getByAltText('Later image')
  expect(image).toHaveAttribute('loading', 'lazy')
  expect(image).not.toHaveAttribute('fetchpriority')
})
