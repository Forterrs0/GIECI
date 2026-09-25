import { Router } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import { HttpError } from "../errors.js";

import {
    cookieName,
    cookieOptions,
    hashToken,
    requireSession,
} from "../middleware/auth.js";


const dummyHash = bcrypt.hashSync(
    "gieci-dummy-password-not-a-user",
    12
);


export function authRoutes(pool, config) {

    const router = Router();


    const loginLimit = rateLimit({
        windowMs:
            15 * 60 * 1000,

        limit: 10,

        skipSuccessfulRequests:
            true,

        standardHeaders:
            "draft-8",

        legacyHeaders:
            false,

        message: {
            error:
                "Muitas tentativas. Aguarde 15 minutos."
        }
    });


    /*
    ====================================
    CADASTRO
    ====================================
    */

    router.post(
        "/register",
        async (req, res) => {

            const input = z
                .strictObject({

                    email:
                        z.string()
                            .trim()
                            .email()
                            .max(254),

                    password:
                        z.string()
                            .min(8)
                            .max(72)

                })
                .parse(req.body);


            const email =
                input.email
                    .toLowerCase();


            /*
            VERIFICA SE JÁ EXISTE
            */

            const [users] =
                await pool.execute(
                    `
                    SELECT id
                    FROM usuarios
                    WHERE email = ?
                    LIMIT 1
                    `,
                    [
                        email
                    ]
                );


            if (users.length > 0) {

                throw new HttpError(
                    409,
                    "Este e-mail já está cadastrado."
                );
            }


            /*
            CRIA HASH DA SENHA
            */

            const senhaHash =
                await bcrypt.hash(
                    input.password,
                    12
                );


            /*
            NOME TEMPORÁRIO
            */

            const nome =
                email.split("@")[0];


            /*
            INSERE NO MYSQL
            */

            const [result] =
                await pool.execute(
                    `
                    INSERT INTO usuarios
                    (
                        nome,
                        email,
                        senha_hash,
                        ativo
                    )

                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        1
                    )
                    `,
                    [
                        nome,
                        email,
                        senhaHash
                    ]
                );


            console.log(
                "NOVO USUÁRIO:",
                email,
                "ID:",
                result.insertId
            );


            return res
                .status(201)
                .json({

                    success:
                        true,

                    message:
                        "Cadastro realizado com sucesso.",

                    user: {

                        id:
                            String(
                                result.insertId
                            ),

                        name:
                            nome,

                        email:
                            email
                    }
                });
        }
    );


    /*
    ====================================
    LOGIN
    ====================================
    */

    router.post(
        "/login",
        loginLimit,
        async (req, res) => {

            const input = z
                .strictObject({

                    email:
                        z.string()
                            .trim()
                            .email()
                            .max(254),

                    password:
                        z.string()
                            .min(1)
                            .max(72)

                })
                .parse(req.body);


            const email =
                input.email
                    .toLowerCase();


            const [[user]] =
                await pool.execute(
                    `
                    SELECT
                        id,
                        nome,
                        email,
                        senha_hash

                    FROM usuarios

                    WHERE email=?
                    AND ativo=1

                    LIMIT 1
                    `,
                    [
                        email
                    ]
                );


            const valid =
                await bcrypt.compare(
                    input.password,

                    user?.senha_hash ||
                    dummyHash
                );


            if (
                !user ||
                !valid
            ) {

                throw new HttpError(
                    401,
                    "E-mail ou senha inválidos."
                );
            }


            const token =
                randomBytes(32)
                    .toString("hex");


            const csrf =
                randomBytes(32)
                    .toString("hex");


            await pool.execute(
                `
                DELETE FROM sessoes
                WHERE expira_em <= UTC_TIMESTAMP(3)
                `
            );


            await pool.execute(
                `
                INSERT INTO sessoes
                (
                    token_hash,
                    csrf_token,
                    usuario_id,
                    expira_em
                )

                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?
                )
                `,
                [
                    hashToken(token),

                    csrf,

                    user.id,

                    new Date(
                        Date.now() +
                        8 *
                        60 *
                        60 *
                        1000
                    )
                ]
            );


            return res
                .cookie(
                    cookieName,
                    token,
                    cookieOptions(config)
                )
                .json({

                    user: {

                        id:
                            String(
                                user.id
                            ),

                        name:
                            user.nome,

                        email:
                            user.email
                    },

                    csrfToken:
                        csrf
                });
        }
    );


    /*
    ====================================
    ROTAS PROTEGIDAS
    ====================================
    */

    router.use(
        requireSession(pool)
    );


    /*
    ====================================
    SESSÃO
    ====================================
    */

    router.get(
        "/session",
        (req, res) => {

            return res.json({

                user: {

                    id:
                        String(
                            req.session.usuario_id
                        ),

                    name:
                        req.session.nome,

                    email:
                        req.session.email
                },

                csrfToken:
                    req.session.csrf_token
            });
        }
    );


    /*
    ====================================
    LOGOUT
    ====================================
    */

    router.post(
        "/logout",
        async (req, res) => {

            await pool.execute(
                `
                DELETE FROM sessoes
                WHERE token_hash=?
                `,
                [
                    req.session.token_hash
                ]
            );


            const {
                maxAge,
                ...options
            } =
                cookieOptions(config);


            return res
                .clearCookie(
                    cookieName,
                    options
                )
                .status(204)
                .end();
        }
    );


    return router;
}