router.post('/users', async (req, res) => {
    console.log(req.body, "Request body");
    try {
        const db = client.db(dbName);
        const collection = db.collection<User>('users');

        // Convert string IDs to ObjectIds
        const userWithObjectIds = {
            ...req.body,
            workspaceAssociations: req.body.workspaceAssociations.map((assoc: any) => ({
                workspace: new ObjectId(assoc.workspace),
                botAssociations: assoc.botAssociations.map((botAssoc: any) => ({
                    bot: botAssoc.bot ? new ObjectId(botAssoc.bot) : null,
                    role: botAssoc.role
                }))
            }))
        };

        console.log(userWithObjectIds, "User data with ObjectIds");

        const result = await collection.insertOne(userWithObjectIds);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
});