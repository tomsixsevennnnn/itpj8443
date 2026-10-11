import { ServiceUnavailableException } from '@nestjs/common'
import { HealthController } from './health.controller'

const makeController = (queryRaw: jest.Mock) => new HealthController({ $queryRaw: queryRaw } as any)

describe('HealthController', () => {
  it('live: คืน ok โดยไม่แตะฐานข้อมูล', () => {
    const queryRaw = jest.fn()
    const result = makeController(queryRaw).live()
    expect(result.status).toBe('ok')
    expect(queryRaw).not.toHaveBeenCalled()
  })

  it('ready: เชื่อมฐานข้อมูลได้ — ok', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }])
    await expect(makeController(queryRaw).ready()).resolves.toEqual({ status: 'ok', database: 'up' })
  })

  it('ready: ฐานข้อมูลล่ม — 503', async () => {
    const queryRaw = jest.fn().mockRejectedValue(new Error('P1001'))
    await expect(makeController(queryRaw).ready()).rejects.toThrow(ServiceUnavailableException)
  })
})
