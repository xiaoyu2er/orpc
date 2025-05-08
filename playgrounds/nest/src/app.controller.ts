import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'
import { Implement, implement } from '@orpc/nest'
import { contract } from './contract'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Implement(contract.auth.me)
  login() {
    return implement(contract.auth.me).handler(({ input }) => {
      console.log({ input })

      return {
        id: '1',
        name: 'John Doe',
        email: 'john@doe.com',
      }
    })
  }
}
