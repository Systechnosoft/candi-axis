import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../infrastructure/database/database.module';

@Injectable()
export class OrganisationsService {
  private readonly logger = new Logger(OrganisationsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll(params: { page: number; limit: number; search?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;
    const search = params.search ? `%${params.search.trim()}%` : null;

    let baseQuery = `
      FROM organisations o
      LEFT JOIN contacts c_email ON o.primary_email_contact_id = c_email.id
      LEFT JOIN contacts c_phone ON o.primary_phone_contact_id = c_phone.id
      LEFT JOIN addresses a ON o.primary_address_id = a.id
      WHERE o.deleted_at IS NULL
    `;

    const queryParams: any[] = [];
    if (search) {
      queryParams.push(search);
      baseQuery += ` AND (o.name ILIKE $1 OR o.org_code ILIKE $1 OR o.legal_name ILIKE $1)`;
    }

    const countQuery = `SELECT COUNT(*)::int as total ${baseQuery}`;
    const countRes = await this.pool.query(countQuery, queryParams);
    const total = countRes.rows[0]?.total || 0;

    const dataQuery = `
      SELECT o.*,
             c_email.contact_value AS primary_contact_email,
             c_phone.contact_value AS primary_contact_phone,
             a.line1 AS address_line1,
             a.line2 AS address_line2,
             a.city AS city,
             a.state AS state,
             a.country AS country,
             a.postal_code AS postal_code
      ${baseQuery}
      ORDER BY o.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const limitIndex = queryParams.length + 1;
    const offsetIndex = queryParams.length + 2;
    const dataParams = [...queryParams, limit, offset];

    const dataRes = await this.pool.query(dataQuery, dataParams);

    return {
      data: dataRes.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const query = `
      SELECT o.*,
             c_email.contact_value AS primary_contact_email,
             c_phone.contact_value AS primary_contact_phone,
             a.line1 AS address_line1,
             a.line2 AS address_line2,
             a.city AS city,
             a.state AS state,
             a.country AS country,
             a.postal_code AS postal_code
      FROM organisations o
      LEFT JOIN contacts c_email ON o.primary_email_contact_id = c_email.id
      LEFT JOIN contacts c_phone ON o.primary_phone_contact_id = c_phone.id
      LEFT JOIN addresses a ON o.primary_address_id = a.id
      WHERE o.id = $1 AND o.deleted_at IS NULL
    `;
    const res = await this.pool.query(query, [id]);
    if (!res.rows[0]) {
      throw new NotFoundException(`Organisation not found`);
    }
    return res.rows[0];
  }

  async create(dto: any) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert organisation
      const orgQuery = `
        INSERT INTO organisations (name, legal_name, primary_contact_name, website_url, industry, company_size, allowed_email_domains, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const orgParams = [
        dto.name,
        dto.legal_name || null,
        dto.primary_contact_name || null,
        dto.website_url || null,
        dto.industry || null,
        dto.company_size || null,
        dto.allowed_email_domains || [],
        dto.status || 'ACTIVE',
      ];
      const orgRes = await client.query(orgQuery, orgParams);
      const org = orgRes.rows[0];

      let emailId = null;
      let phoneId = null;
      let addressId = null;

      // Insert email contact
      if (dto.primary_contact_email) {
        const contactQuery = `
          INSERT INTO contacts (org_id, entity_type, entity_id, contact_type, contact_value, is_primary)
          VALUES ($1, 'organisation', $1, 'email', $2, true)
          RETURNING id
        `;
        const contactRes = await client.query(contactQuery, [org.id, dto.primary_contact_email]);
        emailId = contactRes.rows[0].id;
      }

      // Insert phone contact
      if (dto.primary_contact_phone) {
        const contactQuery = `
          INSERT INTO contacts (org_id, entity_type, entity_id, contact_type, contact_value, is_primary)
          VALUES ($1, 'organisation', $1, 'phone', $2, true)
          RETURNING id
        `;
        const contactRes = await client.query(contactQuery, [org.id, dto.primary_contact_phone]);
        phoneId = contactRes.rows[0].id;
      }

      // Insert address
      if (dto.address_line1) {
        const addrQuery = `
          INSERT INTO addresses (org_id, entity_type, entity_id, address_type, line1, line2, city, state, country, postal_code, is_primary)
          VALUES ($1, 'organisation', $1, 'primary', $2, $3, $4, $5, $6, $7, true)
          RETURNING id
        `;
        const addrRes = await client.query(addrQuery, [
          org.id,
          dto.address_line1,
          dto.address_line2 || null,
          dto.city || null,
          dto.state || null,
          dto.country || 'India',
          dto.postal_code || null,
        ]);
        addressId = addrRes.rows[0].id;
      }

      // Update organization with contact and address IDs
      if (emailId || phoneId || addressId) {
        await client.query(
          `UPDATE organisations
           SET primary_email_contact_id = $1,
               primary_phone_contact_id = $2,
               primary_address_id = $3
           WHERE id = $4`,
          [emailId, phoneId, addressId, org.id]
        );
      }

      await client.query('COMMIT');
      return this.findOne(org.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async update(id: string, dto: any) {
    const org = await this.findOne(id);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update organisation
      const orgQuery = `
        UPDATE organisations
        SET name = $1,
            legal_name = $2,
            primary_contact_name = $3,
            website_url = $4,
            industry = $5,
            company_size = $6,
            allowed_email_domains = $7,
            status = $8,
            updated_at = now()
        WHERE id = $9
      `;
      const orgParams = [
        dto.name !== undefined ? dto.name : org.name,
        dto.legal_name !== undefined ? dto.legal_name : org.legal_name,
        dto.primary_contact_name !== undefined ? dto.primary_contact_name : org.primary_contact_name,
        dto.website_url !== undefined ? dto.website_url : org.website_url,
        dto.industry !== undefined ? dto.industry : org.industry,
        dto.company_size !== undefined ? dto.company_size : org.company_size,
        dto.allowed_email_domains !== undefined ? dto.allowed_email_domains : org.allowed_email_domains,
        dto.status !== undefined ? dto.status : org.status,
        id,
      ];
      await client.query(orgQuery, orgParams);

      // Handle email update
      if (dto.primary_contact_email !== undefined) {
        if (org.primary_email_contact_id) {
          await client.query(
            `UPDATE contacts SET contact_value = $1, updated_at = now() WHERE id = $2`,
            [dto.primary_contact_email, org.primary_email_contact_id]
          );
        } else if (dto.primary_contact_email) {
          const res = await client.query(
            `INSERT INTO contacts (org_id, entity_type, entity_id, contact_type, contact_value, is_primary)
             VALUES ($1, 'organisation', $1, 'email', $2, true)
             RETURNING id`,
            [id, dto.primary_contact_email]
          );
          await client.query(
            `UPDATE organisations SET primary_email_contact_id = $1 WHERE id = $2`,
            [res.rows[0].id, id]
          );
        }
      }

      // Handle phone update
      if (dto.primary_contact_phone !== undefined) {
        if (org.primary_phone_contact_id) {
          await client.query(
            `UPDATE contacts SET contact_value = $1, updated_at = now() WHERE id = $2`,
            [dto.primary_contact_phone, org.primary_phone_contact_id]
          );
        } else if (dto.primary_contact_phone) {
          const res = await client.query(
            `INSERT INTO contacts (org_id, entity_type, entity_id, contact_type, contact_value, is_primary)
             VALUES ($1, 'organisation', $1, 'phone', $2, true)
             RETURNING id`,
            [id, dto.primary_contact_phone]
          );
          await client.query(
            `UPDATE organisations SET primary_phone_contact_id = $1 WHERE id = $2`,
            [res.rows[0].id, id]
          );
        }
      }

      // Handle address update
      if (
        dto.address_line1 !== undefined ||
        dto.address_line2 !== undefined ||
        dto.city !== undefined ||
        dto.state !== undefined ||
        dto.country !== undefined ||
        dto.postal_code !== undefined
      ) {
        if (org.primary_address_id) {
          await client.query(
            `UPDATE addresses
             SET line1 = COALESCE($1, line1),
                 line2 = COALESCE($2, line2),
                 city = COALESCE($3, city),
                 state = COALESCE($4, state),
                 country = COALESCE($5, country),
                 postal_code = COALESCE($6, postal_code),
                 updated_at = now()
             WHERE id = $7`,
            [
              dto.address_line1 !== undefined ? dto.address_line1 : null,
              dto.address_line2 !== undefined ? dto.address_line2 : null,
              dto.city !== undefined ? dto.city : null,
              dto.state !== undefined ? dto.state : null,
              dto.country !== undefined ? dto.country : null,
              dto.postal_code !== undefined ? dto.postal_code : null,
              org.primary_address_id,
            ]
          );
        } else if (dto.address_line1) {
          const res = await client.query(
            `INSERT INTO addresses (org_id, entity_type, entity_id, address_type, line1, line2, city, state, country, postal_code, is_primary)
             VALUES ($1, 'organisation', $1, 'primary', $2, $3, $4, $5, $6, $7, true)
             RETURNING id`,
            [
              id,
              dto.address_line1,
              dto.address_line2 || null,
              dto.city || null,
              dto.state || null,
              dto.country || 'India',
              dto.postal_code || null,
            ]
          );
          await client.query(
            `UPDATE organisations SET primary_address_id = $1 WHERE id = $2`,
            [res.rows[0].id, id]
          );
        }
      }

      await client.query('COMMIT');
      return this.findOne(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async remove(id: string) {
    const res = await this.pool.query(
      `UPDATE organisations
       SET deleted_at = now(), status = 'DELETED'
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (res.rowCount === 0) {
      throw new NotFoundException(`Organisation not found`);
    }
    return { success: true };
  }
}
