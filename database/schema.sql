-- Schema GIECI 2.0
-- Este arquivo é executado por `npm run db:init` (src/scripts/initDatabase.js)
-- em um banco já criado e vazio. NÃO inclui CREATE DATABASE nem USE:
-- o script Node já cuida disso antes de rodar este arquivo.
-- Não contém dados de exemplo, senhas nem tokens.

SET NAMES utf8mb4;

-- ------------------------------------------------------
-- Controle de versão do schema (checado por server.js e initDatabase.js)
-- ------------------------------------------------------
CREATE TABLE schema_migrations (
    version     VARCHAR(50) NOT NULL PRIMARY KEY,
    applied_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO schema_migrations (version) VALUES ('gieci-2.0');

-- ------------------------------------------------------
-- Usuários do painel (login)
-- ------------------------------------------------------
CREATE TABLE usuarios (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    email       VARCHAR(254) NOT NULL,
    senha_hash  VARCHAR(255) NOT NULL,
    ativo       TINYINT(1) NOT NULL DEFAULT 1,
    criado_em   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB;

-- ------------------------------------------------------
-- Sessões de login (cookie httpOnly + csrf)
-- ------------------------------------------------------
CREATE TABLE sessoes (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    token_hash  CHAR(64) NOT NULL,
    csrf_token  CHAR(64) NOT NULL,
    usuario_id  INT UNSIGNED NOT NULL,
    expira_em   DATETIME(3) NOT NULL,
    criado_em   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_sessoes_token_hash (token_hash),
    KEY idx_sessoes_expira_em (expira_em),
    CONSTRAINT fk_sessoes_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------
-- Armários e prateleiras (organização física)
-- ------------------------------------------------------
CREATE TABLE armarios (
    id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome  VARCHAR(120) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE prateleiras (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    armario_id  INT UNSIGNED NULL,
    KEY idx_prateleiras_armario (armario_id),
    CONSTRAINT fk_prateleiras_armario FOREIGN KEY (armario_id)
        REFERENCES armarios (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------
-- Produtos (peso_atual é a fonte do estoque)
-- ------------------------------------------------------
CREATE TABLE produtos (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo              VARCHAR(64) NOT NULL,
    nome                VARCHAR(160) NOT NULL,
    categoria           VARCHAR(80) NOT NULL,
    prateleira_id       INT UNSIGNED NOT NULL,
    peso_unitario       DECIMAL(15,3) NOT NULL,
    peso_atual          DECIMAL(15,3) NOT NULL DEFAULT 0,
    quantidade_minima   DECIMAL(15,3) NOT NULL DEFAULT 0,
    tolerancia_peso     DECIMAL(15,3) NOT NULL DEFAULT 5,
    versao              INT UNSIGNED NOT NULL DEFAULT 1,
    ativo               TINYINT(1) NOT NULL DEFAULT 1,
    ultima_atualizacao  DATETIME(3) NULL,
    criado_em           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_produtos_codigo (codigo),
    KEY idx_produtos_prateleira (prateleira_id),
    KEY idx_produtos_ativo (ativo),
    CONSTRAINT fk_produtos_prateleira FOREIGN KEY (prateleira_id)
        REFERENCES prateleiras (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------
-- Dispositivos ESP32 (autenticação por token com hash bcrypt)
-- ------------------------------------------------------
CREATE TABLE dispositivos (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dispositivo_id  VARCHAR(80) NOT NULL,
    token_hash      VARCHAR(255) NOT NULL,
    ativo           TINYINT(1) NOT NULL DEFAULT 1,
    ultimo_contato  DATETIME(3) NULL,
    criado_em       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_dispositivos_dispositivo_id (dispositivo_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------
-- Balanças (cada produto admite uma balança, e cada dispositivo, uma balança)
-- ------------------------------------------------------
CREATE TABLE balancas (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    identificacao       VARCHAR(80) NOT NULL,
    dispositivo_id      INT UNSIGNED NOT NULL,
    produto_id          INT UNSIGNED NOT NULL,
    ativo               TINYINT(1) NOT NULL DEFAULT 1,
    ultimo_peso         DECIMAL(15,3) NULL,
    ultima_leitura_em   DATETIME(3) NULL,
    criado_em           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_balancas_identificacao (identificacao),
    UNIQUE KEY uq_balancas_dispositivo (dispositivo_id),
    UNIQUE KEY uq_balancas_produto (produto_id),
    CONSTRAINT fk_balancas_dispositivo FOREIGN KEY (dispositivo_id)
        REFERENCES dispositivos (id) ON DELETE RESTRICT,
    CONSTRAINT fk_balancas_produto FOREIGN KEY (produto_id)
        REFERENCES produtos (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------
-- Histórico de movimentações (entradas/saídas aplicadas ao estoque)
-- ------------------------------------------------------
CREATE TABLE movimentacoes (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    produto_id          INT UNSIGNED NOT NULL,
    produto_nome        VARCHAR(160) NOT NULL,
    balanca_id          INT UNSIGNED NULL,
    usuario_id          INT UNSIGNED NULL,
    tipo_movimentacao   ENUM('ENTRADA', 'SAIDA') NOT NULL,
    origem              ENUM('manual', 'sensor') NOT NULL,
    quantidade          INT UNSIGNED NOT NULL,
    peso_anterior       DECIMAL(15,3) NOT NULL,
    peso_atual          DECIMAL(15,3) NOT NULL,
    variacao            DECIMAL(15,3) NOT NULL,
    confianca           TINYINT UNSIGNED NOT NULL,
    data_hora           DATETIME(3) NOT NULL,
    KEY idx_movimentacoes_produto (produto_id),
    KEY idx_movimentacoes_data (data_hora),
    CONSTRAINT fk_movimentacoes_produto FOREIGN KEY (produto_id)
        REFERENCES produtos (id) ON DELETE RESTRICT,
    CONSTRAINT fk_movimentacoes_balanca FOREIGN KEY (balanca_id)
        REFERENCES balancas (id) ON DELETE SET NULL,
    CONSTRAINT fk_movimentacoes_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------
-- Leituras brutas do sensor (inclusive as ignoradas por ruído/replay)
-- ------------------------------------------------------
CREATE TABLE leituras_peso (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    balanca_id  INT UNSIGNED NOT NULL,
    peso        DECIMAL(15,3) NOT NULL,
    data_hora   DATETIME(3) NOT NULL,
    status      ENUM('aplicada', 'ruido') NOT NULL,
    KEY idx_leituras_balanca (balanca_id),
    CONSTRAINT fk_leituras_balanca FOREIGN KEY (balanca_id)
        REFERENCES balancas (id) ON DELETE RESTRICT
) ENGINE=InnoDB;
