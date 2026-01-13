import { Sellers } from '../model/sellers.model'
import { Request, Response } from 'express'

export async function GetSellers(req: Request, res: Response) {
  try {
    const sellers = await Sellers.findAll()

    return res.status(200).json(sellers)
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener los vendedores', error })
  }
}