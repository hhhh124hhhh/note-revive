/**
 * 强制数据库重置工具
 * 用于彻底清除损坏的 IndexedDB 数据库
 */

export async function forceResetAllDatabases(): Promise<void> {
  console.log('🔥 开始强制重置所有数据库...');

  try {
    // 获取所有数据库
    const databases = await indexedDB.databases();
    console.log('📋 发现数据库:', databases);

    // 只删除相关的数据库，避免影响其他应用
    const deletePromises = databases
      .filter(db => db.name && db.name.includes('NoteReviveDB'))
      .map(db => {
        console.log(`🗑️ 删除数据库: ${db.name}`);
        return new Promise<void>((resolve, reject) => {
          const deleteReq = indexedDB.deleteDatabase(db.name!);
          
          deleteReq.onsuccess = () => {
            console.log(`✅ 数据库 ${db.name} 删除成功`);
            resolve();
          };
          
          deleteReq.onerror = () => {
            console.error(`❌ 数据库 ${db.name} 删除失败`);
            reject(new Error(`Failed to delete database ${db.name}`));
          };
          
          deleteReq.onblocked = () => {
            console.warn(`⚠️ 数据库 ${db.name} 删除被阻塞，可能有其他连接`);
            // 等待一段时间后继续
            setTimeout(() => resolve(), 1000);
          };
        });
      });

    await Promise.all(deletePromises);

    // 清理相关的本地存储，避免影响其他数据
    console.log('🧹 清理应用相关存储...');
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('note-revive')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ 清理本地存储项: ${key}`);
    });

    // 清理会话存储
    sessionStorage.clear();
    console.log('🧹 会话存储已清理');

    // 清理可能的应用缓存（只清理相关的缓存）
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const appCacheNames = cacheNames.filter(name => name.includes('note-revive'));
      
      await Promise.all(
        appCacheNames.map(cacheName => {
          console.log(`🗑️ 删除缓存: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
      
      if (appCacheNames.length > 0) {
        console.log(`🗑️ 已清理 ${appCacheNames.length} 个应用缓存`);
      }
    }

    console.log('✅ 强制数据库重置完成！');
    console.log('🔄 将在2秒后自动刷新页面...');

    // 延迟刷新以确保清理完成
    setTimeout(() => {
      window.location.reload();
    }, 2000);

  } catch (error) {
    console.error('❌ 强制重置数据库失败:', error);
    // 即使重置失败，也尝试重新加载页面
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }
}

/**
 * 检查并修复数据库问题
 */
export async function checkAndFixDatabase(): Promise<boolean> {
  console.log('🔍 检查数据库状态...');

  try {
    // 检查是否有损坏的数据库
    const databases = await indexedDB.databases();
    const problematicDatabases = databases.filter(db =>
      db.name && db.name.includes('NoteReviveDB')
    );

    // 只有在确实存在问题时才执行重置
    if (problematicDatabases.length > 0) {
      // 检查数据库是否真的有问题
      let hasRealProblem = false;
      
      for (const dbInfo of problematicDatabases) {
        try {
          // 尝试打开数据库检查是否有问题
          const openReq = indexedDB.open(dbInfo.name!, dbInfo.version);
          
          await new Promise<void>((resolve, reject) => {
            openReq.onsuccess = () => {
              openReq.result.close();
              resolve();
            };
            
            openReq.onerror = () => {
              hasRealProblem = true;
              reject(new Error(`Database ${dbInfo.name} has errors`));
            };
            
            openReq.onupgradeneeded = (event) => {
              // 如果需要升级，可能存在问题
              if (event.oldVersion !== event.newVersion) {
                hasRealProblem = true;
              }
              openReq.transaction?.abort();
            };
          });
        } catch (error) {
          console.warn(`数据库 ${dbInfo.name} 检查失败:`, error);
          hasRealProblem = true;
        }
      }
      
      if (hasRealProblem) {
        console.log('🚨 发现数据库问题，执行强制重置...');
        await forceResetAllDatabases();
        return true;
      }
    }

    console.log('✅ 数据库状态正常');
    return false;

  } catch (error) {
    console.error('❌ 检查数据库状态失败:', error);
    // 只有在确定有问题时才返回true
    return false;
  }
}

/**
 * 在浏览器控制台中可用的快速修复函数
 */
if (typeof window !== 'undefined') {
  (window as any).forceResetDatabase = forceResetAllDatabases;
  (window as any).fixDatabase = checkAndFixDatabase;

  console.log('🔧 数据库修复工具已加载');
  console.log('💡 在控制台中使用 forceResetDatabase() 来强制重置');
  console.log('💡 在控制台中使用 fixDatabase() 来检查并修复');
}