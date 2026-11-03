const bcrypt = require("bcryptjs");
const pool = require("./db");

async function createAdmin() {
    try {
        const name = "OFS Admin";
        const email = "admin@legacyofs.com";
        const password = "Admin@12345";

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users
            (name, email, password_hash, role, is_active)
            VALUES ($1, $2, $3, 'admin', TRUE)

            ON CONFLICT (email)
            DO UPDATE SET
                name = EXCLUDED.name,
                password_hash = EXCLUDED.password_hash,
                role = 'admin',
                is_active = TRUE

            RETURNING id, name, email, role, is_active`,
            [name, email, passwordHash]
        );

        console.log("Admin account ready!");
        console.log(result.rows[0]);

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        await pool.end();
    }
}

createAdmin();