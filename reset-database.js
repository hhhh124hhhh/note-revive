// 数据库重置脚本
// 用于解决数据库schema不匹配导致的设置加载失败问题

console.log('🔧 Note Revive 数据库重置工具');
console.log('================================');

// 清理所有可能损坏的数据库
const clearAllDatabases = async () => {
    try {
        console.log('🗑️ 开始清理数据库...');

        // 清理主应用数据库
        if (window.indexedDB) {
            const databases = await window.indexedDB.databases();
            console.log('📋 发现的数据库:', databases.map(db => db.name));

            for (const db of databases) {
                if (db.name.includes('note-revive') || db.name.includes('NoteRevive')) {
                    console.log(`🗑️ 删除数据库: ${db.name}`);
                    await window.indexedDB.deleteDatabase(db.name);
                }
            }
        }

        // 清理 localStorage
        console.log('🧹 清理 localStorage...');
        localStorage.clear();

        // 清理 sessionStorage
        console.log('🧹 清理 sessionStorage...');
        sessionStorage.clear();

        console.log('✅ 数据库清理完成！');
        console.log('🔄 请刷新页面以重新初始化数据库...');

        return true;
    } catch (error) {
        console.error('❌ 数据库清理失败:', error);
        return false;
    }
};

// 显示确认对话框
const showConfirmDialog = () => {
    const confirmed = confirm(
        '⚠️ 数据库重置确认\n\n' +
        '此操作将：\n' +
        '• 删除所有便签数据\n' +
        '• 删除所有设置\n' +
        '• 删除所有标签\n' +
        '• 清理本地存储\n\n' +
        '确定要继续吗？\n\n' +
        '建议：如果可能，请先导出重要的便签数据。'
    );

    if (confirmed) {
        clearAllDatabases().then(success => {
            if (success) {
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                alert('数据库重置失败，请尝试手动清理浏览器数据');
            }
        });
    }
};

// 自动检测数据库问题
const detectDatabaseIssues = async () => {
    try {
        console.log('🔍 检测数据库问题...');

        // 尝试访问设置
        const { getSettings } = await import('./src/db.ts');
        const settings = await getSettings();

        console.log('✅ 数据库访问正常');
        console.log('📋 当前设置:', settings);

        return false; // 没有发现问题
    } catch (error) {
        console.error('❌ 检测到数据库问题:', error);

        if (error.message.includes('SchemaError') ||
            error.message.includes('KeyPath') ||
            error.message.includes('version') ||
            error.message.includes('settings')) {
            console.log('🔧 检测到数据库schema问题，建议重置数据库');
            return true;
        }

        return false;
    }
};

// 主函数
const main = async () => {
    console.log('🚀 启动数据库诊断...');

    const hasIssues = await detectDatabaseIssues();

    if (hasIssues) {
        console.log('⚠️ 发现数据库问题');
        setTimeout(() => {
            showConfirmDialog();
        }, 1000);
    } else {
        console.log('✅ 数据库状态正常');
        console.log('💡 如果仍然遇到问题，可以手动调用 clearAllDatabases() 函数');
    }

    // 将函数暴露到全局作用域，以便手动调用
    window.clearAllDatabases = clearAllDatabases;
    window.resetDatabase = showConfirmDialog;

    console.log('🔧 可用的命令:');
    console.log('  • resetDatabase() - 显示确认对话框并重置数据库');
    console.log('  • clearAllDatabases() - 直接清理数据库（无确认）');
};

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
    main();
} else {
    console.log('此脚本需要在浏览器环境中运行');
}

export { clearAllDatabases, resetDatabase, detectDatabaseIssues };