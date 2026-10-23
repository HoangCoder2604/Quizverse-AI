import {test,expect} from "@playwright/test";
test("unauthenticated API refuses user data",async({request})=>{
  for(const path of ["/api/community/profile","/api/community/admin/reports"]){
    const response=await request.get(path);
    expect([401,403]).toContain(response.status());
  }
});
test("admin route does not display reports to guest",async({page})=>{
 await page.goto("/community/admin");
 await expect(page).not.toHaveURL(/\/community\/admin$/);
});
